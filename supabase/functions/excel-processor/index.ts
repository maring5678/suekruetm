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
      console.log('Starting CSV data processing...');
      
      try {
        // CSV-Daten als Text lesen
        const csvText = new TextDecoder().decode(arrayBuffer);
        console.log('CSV content preview:', csvText.substring(0, 500));
        
        // CSV in Zeilen aufteilen
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          throw new Error('CSV-Datei ist leer');
        }
        
        // Erste Zeile ist der Header (Spielernamen in Spalte A, dann Runden)
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        
        console.log('CSV headers:', headers);
        
        // Player-Daten sammeln
        const playerTotals = new Map();
        
        // Alle Zeilen durchgehen (ab Zeile 2, da Zeile 1 Header ist)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          
          if (values.length === 0 || !values[0]) continue;
          
          const playerName = values[0];
          
          // Alle Runden für diesen Spieler durchgehen
          for (let j = 1; j < values.length && j < headers.length; j++) {
            const pointsStr = values[j];
            
            // Nur wenn eine Zahl eingegeben ist (Spieler hat teilgenommen)
            if (pointsStr && pointsStr !== '' && !isNaN(Number(pointsStr))) {
              const points = Number(pointsStr);
              
              // Zu den Gesamtpunkten hinzufügen
              if (!playerTotals.has(playerName)) {
                playerTotals.set(playerName, { total_points: 0, tournaments_played: 0 });
              }
              
              const playerData = playerTotals.get(playerName);
              playerData.total_points += points;
              playerData.tournaments_played += 1;
            }
          }
        }
        
        console.log(`Found ${playerTotals.size} players in CSV`);
        
        // Daten in die Datenbank einfügen
        let importedCount = 0;
        
        for (const [playerName, data] of playerTotals) {
          try {
            const { error } = await supabase
              .from('historical_player_totals')
              .insert({
                player_name: playerName,
                total_points: data.total_points,
                tournaments_played: data.tournaments_played
              });
            
            if (error) {
              console.error('Error inserting player data:', error);
            } else {
              importedCount++;
              console.log(`Imported data for ${playerName}: ${data.total_points} points, ${data.tournaments_played} tournaments`);
            }
          } catch (error) {
            console.error('Error processing player:', playerName, error);
          }
        }
        
        return importedCount;
        
      } catch (error) {
        console.error('Error processing CSV:', error);
        throw error;
      }
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