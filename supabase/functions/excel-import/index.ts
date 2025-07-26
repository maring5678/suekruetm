import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Historische Gesamtpunktzahlen aus der Excel-Tabelle
const HISTORICAL_PLAYER_TOTALS = {
  'Felix': 1222,
  'Felix W': 708,
  'Tho': 435,
  'Michel': 381,
  'Andi': 324,
  'Marv': 209,
  'Thali': 196,
  'Igor': 45,
  'Peter': 31,
  'Rochen': 4,
  'Yve': 4,
  'Dani': 1,
  'Jana': 0,
  'Mikey': 0,
  'Phil': 0
};

Deno.serve(async (req) => {
  console.log('Importing historical player totals...');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Import historische Gesamtpunkte
    const importHistoricalTotals = async () => {
      try {
        console.log('Starting import of historical player totals...');
        
        const results = [];
        for (const [playerName, totalPoints] of Object.entries(HISTORICAL_PLAYER_TOTALS)) {
          try {
            console.log(`Importing ${playerName}: ${totalPoints} points`);
            
            const { error } = await supabase
              .from('historical_player_totals')
              .upsert({
                player_name: playerName,
                total_points: totalPoints,
                tournaments_played: 1 // Placeholder für bisherige Turniere
              }, {
                onConflict: 'player_name'
              });
            
            if (error) {
              console.error(`Error saving ${playerName}:`, error);
              results.push({ player: playerName, success: false, error: error.message });
            } else {
              console.log(`Successfully saved ${playerName}: ${totalPoints} points`);
              results.push({ player: playerName, success: true, totalPoints });
            }
          } catch (error) {
            console.error(`Error saving ${playerName}:`, error);
            results.push({ player: playerName, success: false, error: error.message });
          }
        }
        
        console.log('Import completed. Results:', results);
        return results;
      } catch (error) {
        console.error('Import error:', error);
        throw error;
      }
    };

    // Starte Background Task
    EdgeRuntime.waitUntil(importHistoricalTotals());

    // Sofortige Antwort
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Importing historical player totals from Excel...',
        playersToImport: Object.keys(HISTORICAL_PLAYER_TOTALS).length,
        status: 'started'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in excel import function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});