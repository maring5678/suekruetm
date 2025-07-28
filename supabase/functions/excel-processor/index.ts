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
    
    console.log('File size:', arrayBuffer.byteLength, 'bytes');
    
    const processExcelData = async () => {
      console.log('Starting Excel/CSV data processing...');
      
      try {
        // Prüfen ob es eine Excel-Datei ist oder CSV
        const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
        console.log('Is Excel file:', isExcel, 'Filename:', fileName);
        
        if (isExcel) {
          try {
            console.log('Attempting to load SheetJS...');
            
            // Einfachere Methode: Verwende die im Deno Land verfügbare SheetJS Version
            const XLSX = await import('https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs');
            console.log('SheetJS loaded successfully');
            
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            console.log('Excel workbook loaded with sheets:', workbook.SheetNames);
            
            let totalImported = 0;
            
            // Alle Sheets durchgehen
            for (const sheetName of workbook.SheetNames) {
              console.log(`Processing sheet: ${sheetName}`);
              const worksheet = workbook.Sheets[sheetName];
              
              // Sheet zu JSON konvertieren (einfacher als CSV)
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              console.log(`Sheet ${sheetName} has ${jsonData.length} rows`);
              
              if (jsonData.length > 1) { // Mindestens Header + 1 Datenzeile
                await processSheetData(jsonData, sheetName);
              }
            }
            
            // Nach Verarbeitung aller Sheets: Alle Daten speichern
            return await saveAllPlayerData();
          } catch (xlsxError) {
            console.error('Excel processing failed, trying as CSV:', xlsxError);
            // Fallback zu CSV
            const csvText = new TextDecoder().decode(arrayBuffer);
            return await processCSVData(csvText, 'CSV-Fallback');
          }
        } else {
          // CSV-Verarbeitung
          const csvText = new TextDecoder().decode(arrayBuffer);
          console.log('CSV content preview:', csvText.substring(0, 500));
          return await processCSVData(csvText, 'CSV');
        }
      } catch (error) {
        console.error('Error processing file:', error);
        throw error;
      }
    };

    // Globale Player-Daten sammeln für alle Sheets
    const globalPlayerTotals = new Map();

    const processSheetData = async (data: any[][], source: string) => {
      console.log(`Processing sheet data from ${source}...`);
      
      if (data.length < 2) {
        console.log('Not enough data in sheet');
        return 0;
      }
      
      const headers = data[0].map((h: any) => String(h || '').trim());
      console.log('Sheet headers:', headers);
      
      let playersFoundInSheet = 0;
      
      // Alle Zeilen durchgehen (ab Zeile 2, da Zeile 1 Header ist)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        if (!row || row.length === 0 || !row[0]) continue;
        
        const playerName = String(row[0]).trim();
        let playerPointsInSheet = 0;
        let playerTournamentsInSheet = 0;
        
        // Alle Runden für diesen Spieler durchgehen
        for (let j = 1; j < row.length && j < headers.length; j++) {
          const pointsValue = row[j];
          
          // Nur wenn eine Zahl eingegeben ist (Spieler hat teilgenommen)
          if (pointsValue !== null && pointsValue !== undefined && pointsValue !== '' && !isNaN(Number(pointsValue))) {
            const points = Number(pointsValue);
            playerPointsInSheet += points;
            playerTournamentsInSheet += 1;
          }
        }
        
        // Nur Spieler hinzufügen, die tatsächlich Punkte haben
        if (playerTournamentsInSheet > 0) {
          if (!globalPlayerTotals.has(playerName)) {
            globalPlayerTotals.set(playerName, { total_points: 0, tournaments_played: 0 });
          }
          
          const playerData = globalPlayerTotals.get(playerName);
          playerData.total_points += playerPointsInSheet;
          playerData.tournaments_played += playerTournamentsInSheet;
          playersFoundInSheet++;
          
          console.log(`Sheet ${source}: ${playerName} = ${playerPointsInSheet} points, ${playerTournamentsInSheet} tournaments`);
        }
      }
      
      console.log(`Found ${playersFoundInSheet} active players in sheet ${source}`);
      return playersFoundInSheet;
    };

    const saveAllPlayerData = async () => {
      console.log(`Saving data for ${globalPlayerTotals.size} players to database...`);
      let savedCount = 0;
      
      for (const [playerName, data] of globalPlayerTotals) {
        try {
          // Direkt ersetzen statt addieren - die globalen Totals enthalten bereits alle Sheet-Daten
          const { error } = await supabase
            .from('historical_player_totals')
            .upsert({
              player_name: playerName,
              total_points: data.total_points,
              tournaments_played: data.tournaments_played
            }, {
              onConflict: 'player_name'
            });
          
          if (error) {
            console.error('Error upserting player data:', error);
          } else {
            savedCount++;
            console.log(`Saved data for ${playerName}: ${data.total_points} points, ${data.tournaments_played} tournaments`);
          }
        } catch (error) {
          console.error('Error processing player:', playerName, error);
        }
      }
      
      return savedCount;
    };
    
    const processCSVData = async (csvText: string, source: string) => {
      console.log(`Processing ${source} data...`);
      
      try {
        // CSV in Zeilen aufteilen
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          throw new Error('CSV-Datei ist leer');
        }
        
        // Erste Zeile ist der Header (Spielernamen in Spalte A, dann Runden)
        const headerLine = lines[0];
        // CSV aus Excel verwendet oft Semikolons statt Kommas
        const separator = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine.split(separator).map(h => h.trim().replace(/"/g, ''));
        
        console.log('CSV headers:', headers);
        
        // Player-Daten sammeln
        const playerTotals = new Map();
        
        // Alle Zeilen durchgehen (ab Zeile 2, da Zeile 1 Header ist)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
          
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
        
        // Für CSV: Daten direkt in die Datenbank einfügen (ersetzen, nicht addieren)
        let importedCount = 0;
        
        for (const [playerName, data] of playerTotals) {
          try {
            // Für CSV: Direkt ersetzen ohne zu addieren
            const { error } = await supabase
              .from('historical_player_totals')
              .upsert({
                player_name: playerName,
                total_points: data.total_points,
                tournaments_played: data.tournaments_played
              }, {
                onConflict: 'player_name'
              });
            
            if (error) {
              console.error('Error upserting player data:', error);
            } else {
              importedCount++;
              console.log(`CSV data for ${playerName}: ${data.total_points} points, ${data.tournaments_played} tournaments`);
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

    // Starte Excel-Verarbeitung
    const importedCount = await processExcelData();

    // Datei nach Verarbeitung löschen (optional)
    await supabase.storage
      .from('excel-imports')
      .remove([fileName]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'CSV-Datei wurde erfolgreich verarbeitet',
        importedRecords: importedCount,
        status: 'completed'
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