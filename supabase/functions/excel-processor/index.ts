import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName } = await req.json();
    console.log('Processing file:', fileName);

    // Starte Background Task für die Verarbeitung
    const backgroundProcessing = async () => {
      try {
        console.log('Starting background processing for:', fileName);
        
        // Datei von Storage herunterladen
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('excel-imports')
          .download(fileName);

        if (downloadError) {
          console.error('Error downloading file:', downloadError);
          return;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        console.log('File size:', arrayBuffer.byteLength, 'bytes');
        
        // Verarbeitung starten
        const result = await processExcelData(arrayBuffer, fileName);
        console.log('Background processing completed. Result:', result);

        // Datei nach erfolgreicher Verarbeitung löschen
        const { error: deleteError } = await supabase.storage
          .from('excel-imports')
          .remove([fileName]);

        if (deleteError) {
          console.error('Error deleting file:', deleteError);
        } else {
          console.log('File deleted successfully');
        }

      } catch (error) {
        console.error('Background processing error:', error);
      }
    };

    // Background Task starten (non-blocking)
    EdgeRuntime.waitUntil(backgroundProcessing());

    // Sofort Response zurücksenden
    return new Response(
      JSON.stringify({ 
        message: 'Excel import started in background',
        status: 'processing',
        fileName: fileName 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202 // Accepted - processing in background
      }
    );

  } catch (error) {
    console.error('Error in excel-processor function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Background processing function
const processExcelData = async (arrayBuffer: ArrayBuffer, fileName: string) => {
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
        
        let totalTournaments = 0;
        
        // Sammle erstmal alle gültigen Sheets
        const validSheets = [];
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
          
          validSheets.push(sheetName);
        }
        
        console.log(`Found ${validSheets.length} valid tournament sheets to process`);
        
        // Verarbeite in kleineren Batches um Speicher zu schonen
        const BATCH_SIZE = 10; // Noch kleinere Batches für Background Processing
        for (let batchStart = 0; batchStart < validSheets.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, validSheets.length);
          const batchSheets = validSheets.slice(batchStart, batchEnd);
          
          console.log(`Processing batch ${Math.floor(batchStart/BATCH_SIZE) + 1}: sheets ${batchStart + 1}-${batchEnd} of ${validSheets.length}`);
          
          // Verarbeite Sheets in diesem Batch sequenziell
          for (const sheetName of batchSheets) {
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
          
          // Kurze Pause zwischen Batches um Speicher freizugeben
          if (batchEnd < validSheets.length) {
            console.log(`Batch completed. Pausing briefly...`);
            await new Promise(resolve => setTimeout(resolve, 200));
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
  
  // Intelligente Header-Erkennung: Suche nach Zeile mit "Runde" oder ähnlichem
  let headerRowIndex = 0;
  let dataStartIndex = 1;
  
  // Prüfe erste 3 Zeilen nach brauchbaren Headern
  for (let i = 0; i < Math.min(3, data.length); i++) {
    const row = data[i];
    if (row && row.length > 1) {
      const rowText = row.map((cell: any) => String(cell || '').toLowerCase()).join(' ');
      if (rowText.includes('runde') || rowText.includes('round') || 
          (row[1] && String(row[1]).toLowerCase().includes('runde')) ||
          (row[2] && String(row[2]).toLowerCase().includes('runde'))) {
        headerRowIndex = i;
        dataStartIndex = i + 1;
        console.log(`Found header row at index ${i}:`, row);
        break;
      }
    }
  }
  
  const headers = data[headerRowIndex].map((h: any) => String(h || '').trim());
  console.log(`Sheet headers (row ${headerRowIndex}):`, headers);
  
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
  
  // Extrahiere die Runden-Header aus der Excel-Datei
  const roundHeaders = [];
  for (let i = 1; i < headers.length; i++) {
    const header = headers[i];
    if (header && header.toLowerCase().includes('runde')) {
      roundHeaders.push({
        index: i,
        name: header,
        roundNumber: roundHeaders.length + 1
      });
    }
  }
  
  console.log(`Found ${roundHeaders.length} round columns:`, roundHeaders);
  
  // Wenn keine Runden-Header gefunden, erstelle eine Standard-Runde
  if (roundHeaders.length === 0) {
    console.log('No round headers found, creating single default round');
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
    
    console.log(`Created default round for tournament ${sheetName}`);
    
    // Verarbeite als eine Runde mit Gesamtpunkten
    return await processPlayersForSingleRound(data, dataStartIndex, tournament.id, round.id, sheetName);
  }
  
  // Erstelle separate Runden für jede Runden-Spalte
  const rounds = [];
  for (const roundHeader of roundHeaders) {
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .insert({
        tournament_id: tournament.id,
        round_number: roundHeader.roundNumber,
        track_name: roundHeader.name,
        track_number: `R${roundHeader.roundNumber}`,
        creator: 'Excel Import'
      })
      .select()
      .single();
    
    if (roundError) {
      console.error('Error creating round:', roundError);
      continue;
    }
    
    rounds.push({
      ...round,
      columnIndex: roundHeader.index
    });
  }
  
  console.log(`Created ${rounds.length} rounds for tournament ${sheetName}`);
  
  // Verarbeite Spieler für alle Runden
  let playersProcessed = 0;
  
  // Alle Zeilen durchgehen (ab der ermittelten Datenstart-Zeile)
  for (let i = dataStartIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    const playerName = String(row[0]).trim();
    
    // Spielernamen validieren
    if (!playerName || playerName === 'Name' || playerName.includes('#') || playerName.length < 2) {
      console.log(`Skipping invalid player name: "${playerName}"`);
      continue;
    }
    
    console.log(`Processing player: ${playerName}`);
    
    // Prüfe, ob der Spieler überhaupt teilgenommen hat
    let hasAnyParticipation = false;
    for (const round of rounds) {
      const cellValue = row[round.columnIndex];
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        const points = typeof cellValue === 'number' ? cellValue : parseInt(String(cellValue));
        if (!isNaN(points) && points >= 0) {
          hasAnyParticipation = true;
          break;
        }
      }
    }
    
    if (!hasAnyParticipation) {
      console.log(`Skipping ${playerName} - no participation in any round`);
      continue;
    }
    
    // Spieler erstellen oder finden
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('name', playerName)
      .single();
    
    let playerId;
    if (existingPlayer) {
      playerId = existingPlayer.id;
    } else {
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
    
    // Turnier-Spieler-Zuordnung erstellen
    const { error: tournamentPlayerError } = await supabase
      .from('tournament_players')
      .insert({
        tournament_id: tournament.id,
        player_id: playerId
      });
    
    if (tournamentPlayerError && !tournamentPlayerError.message?.includes('duplicate')) {
      console.error('Error creating tournament player:', tournamentPlayerError);
      continue;
    }
    
    // Für jede Runde die Ergebnisse erstellen
    for (const round of rounds) {
      const cellValue = row[round.columnIndex];
      
      // Nur erstellen wenn der Spieler teilgenommen hat
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        const points = typeof cellValue === 'number' ? cellValue : parseInt(String(cellValue));
        
        if (!isNaN(points) && points >= 0) {
          console.log(`${playerName} - Round ${round.round_number}: ${points} points`);
          
          const { error: resultError } = await supabase
            .from('round_results')
            .insert({
              round_id: round.id,
              player_id: playerId,
              position: 1, // Wird später korrekt sortiert
              points: points
            });
          
          if (resultError) {
            console.error('Error creating round result:', resultError);
          }
        }
      }
    }
    
    playersProcessed++;
  }
  
  console.log(`Processed ${playersProcessed} players for tournament ${sheetName}`);
  return playersProcessed;
};

// Hilfsfunktion für Single-Round-Verarbeitung (Fallback)
const processPlayersForSingleRound = async (data: any[][], dataStartIndex: number, tournamentId: string, roundId: string, sheetName: string) => {
  let playersProcessed = 0;
  
  for (let i = dataStartIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    const playerName = String(row[0]).trim();
    
    if (!playerName || playerName === 'Name' || playerName.includes('#') || playerName.length < 2) {
      continue;
    }
    
    // Summiere alle Punkte aus allen Spalten für Gesamtergebnis
    let totalPoints = 0;
    let hasAnyFilledField = false;
    
    for (let j = 1; j < row.length; j++) {
      const cellValue = row[j];
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        const points = typeof cellValue === 'number' ? cellValue : parseInt(String(cellValue));
        if (!isNaN(points) && points >= 0) {
          hasAnyFilledField = true;
          totalPoints += points;
        }
      }
    }
    
    if (!hasAnyFilledField) continue;
    
    // Spieler erstellen/finden und Ergebnis eintragen
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('name', playerName)
      .single();
    
    let playerId;
    if (existingPlayer) {
      playerId = existingPlayer.id;
    } else {
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({ name: playerName })
        .select()
        .single();
      
      if (playerError) continue;
      playerId = newPlayer.id;
    }
    
    await supabase
      .from('tournament_players')
      .insert({
        tournament_id: tournamentId,
        player_id: playerId
      });
    
    await supabase
      .from('round_results')
      .insert({
        round_id: roundId,
        player_id: playerId,
        position: 1,
        points: totalPoints
      });
    
    playersProcessed++;
  }
  
  return playersProcessed;
};

// CSV-Verarbeitung als Fallback
const processCSVAsTournament = async (csvData: string, tournamentName: string) => {
  console.log(`Processing CSV as tournament: ${tournamentName}`);
  
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    console.log('Not enough lines in CSV');
    return 0;
  }
  
  // Bestimme den Separator (Komma oder Semikolon)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  console.log(`Using separator: "${separator}"`);
  
  // Parse CSV-Daten
  const data = lines.map(line => line.split(separator).map(cell => cell.trim()));
  
  // Verwende die gleiche Logik wie bei Excel-Sheets
  return await processSheetAsTournament(data, tournamentName);
};

// Shutdown handler für graceful shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown due to:', ev.detail?.reason);
});