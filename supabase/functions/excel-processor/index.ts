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
            
            let totalTournaments = 0;
            
            // Alle Sheets durchgehen und nur die mit Datumsformat verarbeiten
            for (const sheetName of workbook.SheetNames) {
              console.log(`Checking sheet: ${sheetName}`);
              
              // Prüfe ob der Sheet-Name dem Datums-Format DD.MM.YY entspricht
              const datePattern = /^\d{1,2}\.\d{1,2}\.\d{2,4}$/;
              if (!datePattern.test(sheetName.trim())) {
                console.log(`Skipping sheet "${sheetName}" - doesn't match date format DD.MM.YY`);
                continue;
              }
              
              // Prüfe ob das Datum >= 21.08.22 ist
              const [day, month, year] = sheetName.trim().split('.');
              const sheetDate = new Date(parseInt('20' + year), parseInt(month) - 1, parseInt(day));
              const cutoffDate = new Date(2022, 7, 21); // 21.08.2022 (Monate sind 0-basiert)
              
              if (sheetDate < cutoffDate) {
                console.log(`Skipping sheet "${sheetName}" - before cutoff date 21.08.22`);
                continue;
              }
              
              console.log(`Processing tournament sheet: ${sheetName}`);
              const worksheet = workbook.Sheets[sheetName];
              
              // Sheet zu JSON konvertieren (einfacher als CSV)
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              console.log(`Sheet ${sheetName} has ${jsonData.length} rows`);
              
              if (jsonData.length > 1) { // Mindestens Header + 1 Datenzeile
                const processed = await processSheetAsTournament(jsonData, sheetName);
                if (processed > 0) totalTournaments++;
              }
            }
            
            console.log(`Processed ${totalTournaments} tournament sheets (date format only)`);
            return totalTournaments;
          } catch (xlsxError) {
            console.error('Excel processing failed, trying as CSV:', xlsxError);
            // Fallback zu CSV - auch als einzelnes Turnier behandeln
            const csvText = new TextDecoder().decode(arrayBuffer);
            return await processCSVAsTournament(csvText, 'CSV-Import');
          }
        } else {
          // CSV-Verarbeitung als einzelnes Turnier
          const csvText = new TextDecoder().decode(arrayBuffer);
          console.log('CSV content preview:', csvText.substring(0, 500));
          return await processCSVAsTournament(csvText, 'CSV-Import');
        }
      } catch (error) {
        console.error('Error processing file:', error);
        throw error;
      }
    };

    const processSheetAsTournament = async (data: any[][], sheetName: string) => {
      console.log(`Processing sheet "${sheetName}" as tournament...`);
      
      if (data.length < 2) {
        console.log('Not enough data in sheet');
        return 0;
      }
      
      const headers = data[0].map((h: any) => String(h || '').trim());
      console.log('Sheet headers:', headers);
      
      // Turnier erstellen
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: sheetName,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (tournamentError) {
        console.error('Error creating tournament:', tournamentError);
        return 0;
      }
      
      console.log(`Created tournament: ${tournament.name} with ID: ${tournament.id}`);
      
      // Eine Runde für das gesamte Turnier erstellen (da es ein Tagesergebnis ist)
      const { data: round, error: roundError } = await supabase
        .from('rounds')
        .insert({
          tournament_id: tournament.id,
          round_number: 1,
          track_name: `Turnier ${sheetName}`,
          track_number: 'T1',
          creator: 'Excel Import'
        })
        .select()
        .single();
      
      if (roundError) {
        console.error('Error creating round:', roundError);
        return 0;
      }
      
      console.log(`Created round for tournament ${sheetName}`);
      
      let playersProcessed = 0;
      
      // Alle Zeilen durchgehen (ab Zeile 2, da Zeile 1 Header ist)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0 || !row[0]) continue;
        
        const playerName = String(row[0]).trim();
        
        // Debug-Ausgabe für Felix
        if (playerName.toLowerCase().includes('felix')) {
          console.log(`DEBUG: Found Felix row in ${sheetName}:`, row);
        }
        
        // Überspringe ungültige Spielernamen (Zeilennummern, leere Namen, etc.)
        if (!playerName || 
            playerName.match(/^\d+\.?$/) || // Zeilennummern wie "1", "1.", "2"
            playerName.toLowerCase() === 'name' || // Header-Zeile
            playerName.toLowerCase() === 'spieler' ||
            playerName.length < 2) {
          console.log(`Skipping invalid player name: "${playerName}"`);
          continue;
        }
        
        // Alle Punkte für diesen Spieler in dieser Zeile addieren
        let totalPointsForDay = 0;
        let hasAnyFilledField = false;
        
        // Durchgehe alle Spalten ab Index 1 (nach Spielername)
        for (let j = 1; j < row.length && j < headers.length; j++) {
          const pointsValue = row[j];
          
          // Ein Feld ist ausgefüllt wenn es nicht null, undefined oder leer ist
          if (pointsValue !== null && pointsValue !== undefined && pointsValue !== '') {
            hasAnyFilledField = true;
            
            // Prüfe ob es eine gültige Zahl ist
            if (!isNaN(Number(pointsValue))) {
              const points = Number(pointsValue);
              totalPointsForDay += points;
            }
          }
        }
        
        // Nur verarbeiten wenn mindestens ein Feld ausgefüllt ist
        if (!hasAnyFilledField) {
          console.log(`Skipping ${playerName} - no filled fields (no participation)`);
          continue;
        }
        
        console.log(`${playerName}: ${totalPointsForDay} total points for ${sheetName} (participated)`);
        
        // Spieler erstellen oder finden
        let { data: existingPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('name', playerName)
          .single();
        
        let playerId;
        if (existingPlayer) {
          playerId = existingPlayer.id;
        } else {
          // Spieler erstellen
          const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert({ name: playerName })
            .select()
            .single();
          
          if (playerError) {
            console.error('Error creating player:', playerError);
            continue;
          }
          playerId = newPlayer.id;
        }
        
        // Spieler zum Turnier hinzufügen
        await supabase
          .from('tournament_players')
          .insert({
            tournament_id: tournament.id,
            player_id: playerId
          });
        
        // Ein Round Result mit der Gesamtpunktzahl für diesen Tag erstellen
        await supabase
          .from('round_results')
          .insert({
            round_id: round.id,
            player_id: playerId,
            points: totalPointsForDay,
            position: 1 // Platzierung wird später berechnet
          });
        
        playersProcessed++;
      }
      
      console.log(`Processed ${playersProcessed} players for tournament ${sheetName}`);
      return playersProcessed;
    };
    
    
    const processCSVAsTournament = async (csvText: string, tournamentName: string) => {
      console.log(`Processing CSV as tournament: ${tournamentName}`);
      
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
        
        // Turnier erstellen
        const { data: tournament, error: tournamentError } = await supabase
          .from('tournaments')
          .insert({
            name: tournamentName,
            completed_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (tournamentError) {
          console.error('Error creating tournament:', tournamentError);
          return 0;
        }
        
        console.log(`Created tournament: ${tournament.name} with ID: ${tournament.id}`);
        
        // Eine Runde für das gesamte Turnier erstellen (da es ein Tagesergebnis ist)
        const { data: round, error: roundError } = await supabase
          .from('rounds')
          .insert({
            tournament_id: tournament.id,
            round_number: 1,
            track_name: `Turnier ${tournamentName}`,
            track_number: 'T1',
            creator: 'CSV Import'
          })
          .select()
          .single();
        
        if (roundError) {
          console.error('Error creating round:', roundError);
          return 0;
        }
        
        console.log(`Created round for CSV tournament ${tournamentName}`);
        
        let playersProcessed = 0;
        
        // Alle Zeilen durchgehen (ab Zeile 2, da Zeile 1 Header ist)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
          
          if (values.length === 0 || !values[0]) continue;
          
          const playerName = values[0];
          
          // Überspringe ungültige Spielernamen (Zeilennummern, leere Namen, etc.)
          if (!playerName || 
              playerName.match(/^\d+\.?$/) || // Zeilennummern wie "1", "1.", "2"
              playerName.toLowerCase() === 'name' || // Header-Zeile
              playerName.toLowerCase() === 'spieler' ||
              playerName.length < 2) {
            console.log(`Skipping invalid player name: "${playerName}"`);
            continue;
          }
          
          // Alle Punkte für diesen Spieler in dieser Zeile addieren
          let totalPointsForDay = 0;
          let hasAnyFilledField = false;
          
          // Durchgehe alle Spalten ab Index 1 (nach Spielername)
          for (let j = 1; j < values.length && j < headers.length; j++) {
            const pointsStr = values[j];
            
            // Ein Feld ist ausgefüllt wenn es nicht null, undefined oder leer ist
            if (pointsStr !== null && pointsStr !== undefined && pointsStr !== '') {
              hasAnyFilledField = true;
              
              // Prüfe ob es eine gültige Zahl ist
              if (!isNaN(Number(pointsStr))) {
                const points = Number(pointsStr);
                totalPointsForDay += points;
              }
            }
          }
          
          // Nur verarbeiten wenn mindestens ein Feld ausgefüllt ist
          if (!hasAnyFilledField) {
            console.log(`Skipping ${playerName} - no filled fields (no participation)`);
            continue;
          }
          
          console.log(`${playerName}: ${totalPointsForDay} total points for ${tournamentName} (participated)`);
          
          // Spieler erstellen oder finden
          let { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('name', playerName)
            .single();
          
          let playerId;
          if (existingPlayer) {
            playerId = existingPlayer.id;
          } else {
            // Spieler erstellen
            const { data: newPlayer, error: playerError } = await supabase
              .from('players')
              .insert({ name: playerName })
              .select()
              .single();
            
            if (playerError) {
              console.error('Error creating player:', playerError);
              continue;
            }
            playerId = newPlayer.id;
          }
          
          // Spieler zum Turnier hinzufügen
          await supabase
            .from('tournament_players')
            .insert({
              tournament_id: tournament.id,
              player_id: playerId
            });
          
          // Ein Round Result mit der Gesamtpunktzahl für diesen Tag erstellen
          await supabase
            .from('round_results')
            .insert({
              round_id: round.id,
              player_id: playerId,
              points: totalPointsForDay,
              position: 1 // Platzierung wird später berechnet
            });
          
          playersProcessed++;
        }
        
        console.log(`Processed ${playersProcessed} players for CSV tournament ${tournamentName}`);
        return playersProcessed;
        
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
        message: 'Datei wurde erfolgreich als Turniere verarbeitet',
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