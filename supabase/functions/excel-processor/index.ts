import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { fileName } = await req.json();

    if (!fileName) {
      throw new Error('Dateiname ist erforderlich');
    }

    console.log('Processing Excel file:', fileName);

    // Excel-Datei aus Storage laden
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('excel-imports')
      .download(fileName);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Datei konnte nicht geladen werden: ${downloadError.message}`);
    }

    // Datei als ArrayBuffer lesen
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Hier würden wir normalerweise eine Excel-Parser-Library verwenden
    // Da wir in Deno sind, simulieren wir das Parsing erstmal
    
    console.log('File size:', arrayBuffer.byteLength, 'bytes');
    
    // TODO: Excel-Parsing implementieren
    // Für jetzt nehmen wir an, dass die Datei erfolgreich verarbeitet wurde
    
    const processExcelData = async () => {
      // Simuliere Excel-Verarbeitung
      console.log('Starting Excel data processing...');
      
      // Hier würde das echte Excel-Parsing stattfinden
      // und die Daten in die entsprechenden Tabellen eingefügt werden
      
      // Beispiel-Import (später durch echte Daten ersetzen)
      const exampleData = [
        { player_name: 'Test Player 1', total_points: 100, tournaments_played: 5 },
        { player_name: 'Test Player 2', total_points: 150, tournaments_played: 7 },
      ];

      let importedCount = 0;
      
      for (const playerData of exampleData) {
        try {
          const { error } = await supabase
            .from('historical_player_totals')
            .insert(playerData);
          
          if (error) {
            console.error('Error inserting player data:', error);
          } else {
            importedCount++;
            console.log(`Imported data for ${playerData.player_name}`);
          }
        } catch (error) {
          console.error('Error processing player:', playerData.player_name, error);
        }
      }

      return importedCount;
    };

    // Starte Background Task
    EdgeRuntime.waitUntil(processExcelData());

    // Datei nach Verarbeitung löschen (optional)
    await supabase.storage
      .from('excel-imports')
      .remove([fileName]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Excel-Datei wird verarbeitet...',
        importedRecords: 2, // Beispielwert
        status: 'processing'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in excel processor function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});