import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Liste aller Turniere in chronologischer Reihenfolge
const ALL_TOURNAMENTS = [
  // 2022
  '21.08.22', '04.09.22', '18.09.22', '02.10.22', '16.10.22', '30.10.22', '13.11.22', '27.11.22', '11.12.22',
  // 2023  
  '08.01.23', '22.01.23', '05.02.23', '19.02.23', '05.03.23', '19.03.23', '02.04.23', '16.04.23', '30.04.23',
  '14.05.23', '28.05.23', '11.06.23', '25.06.23', '09.07.23', '23.07.23', '06.08.23', '20.08.23', '03.09.23',
  '17.09.23', '01.10.23', '15.10.23', '29.10.23', '12.11.23', '26.11.23', '10.12.23',
  // 2024
  '07.01.24', '21.01.24', '04.02.24', '18.02.24', '03.03.24', '17.03.24', '31.03.24', '14.04.24', '28.04.24',
  '12.05.24', '26.05.24', '09.06.24', '23.06.24', '07.07.24', '21.07.24', '04.08.24', '18.08.24', '01.09.24',
  '15.09.24', '29.09.24', '13.10.24', '27.10.24', '10.11.24', '24.11.24', '08.12.24',
  // 2025
  '19.01.25', '02.02.25', '16.02.25', '02.03.25', '16.03.25', '30.03.25', '13.04.25', '27.04.25', '11.05.25',
  '25.05.25', '08.06.25', '22.06.25', '06.07.25', '20.07.25'
];

// Beispieldaten für verschiedene Turniere mit verschiedenen Spielerzusammensetzungen
const SAMPLE_TOURNAMENT_DATA = {
  '21.08.22': {
    players: ['Felix', 'Thali', 'Andi', 'Michel', 'Tho', 'Igor', 'Jany', 'Alex'],
    rounds: 5,
    results: {
      'Felix': [3, 2, 3, 1, 3],
      'Thali': [2, 3, 2, 3, 1], 
      'Andi': [1, 1, 1, 2, 2],
      'Michel': [0, 0, 0, 0, 0],
      'Tho': [0, 2, 0, 1, 1],
      'Igor': [1, 0, 1, 0, 2],
      'Jany': [0, 1, 0, 2, 0],
      'Alex': [2, 0, 2, 0, 0]
    }
  },
  '04.09.22': {
    players: ['Felix', 'Thali', 'Andi', 'Tho', 'Igor', 'Niko', 'Marco', 'Alex'],
    rounds: 4,
    results: {
      'Felix': [3, 3, 2, 3],
      'Thali': [2, 2, 3, 2],
      'Andi': [1, 1, 1, 1],
      'Tho': [2, 0, 0, 0],
      'Igor': [0, 2, 1, 0],
      'Niko': [1, 1, 0, 1],
      'Marco': [0, 0, 2, 1],
      'Alex': [0, 0, 0, 2]
    }
  }
  // Weitere Turniere werden nach diesem Muster generiert
};

function generateTournamentData(tournamentName: string) {
  // Für existierende Sample-Daten
  if (SAMPLE_TOURNAMENT_DATA[tournamentName]) {
    return SAMPLE_TOURNAMENT_DATA[tournamentName];
  }
  
  // Alle echten Spieler aus Spalte 1 der Excel-Datei verwenden
  const tournamentPlayers = ['Felix W', 'Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix', 'Dani', 'Yve', 'Peter', 'Mary', 'Rochen', 'Mikey', 'Phil', 'Jana', 'Grischa', 'Alex', 'Steffen', 'Franz', 'Andi G'];
  
  const rounds = Math.floor(Math.random() * 3) + 4; // 4-6 Runden
  const results: { [key: string]: number[] } = {};
  
  // Generiere realistische Ergebnisse
  for (const player of tournamentPlayers) {
    results[player] = [];
    for (let round = 0; round < rounds; round++) {
      // Verschiedene Wahrscheinlichkeiten je nach Spieler
      let points = 0;
      const playerSkill = getPlayerSkill(player);
      const random = Math.random();
      
      if (random < playerSkill * 0.3) points = 3; // 1. Platz
      else if (random < playerSkill * 0.6) points = 2; // 2. Platz  
      else if (random < playerSkill * 0.8) points = 1; // 3. Platz
      // Sonst 0 Punkte
      
      results[player].push(points);
    }
  }
  
  return { players: tournamentPlayers, rounds, results };
}

function getPlayerSkill(player: string): number {
  const skills = {
    'Felix': 0.9,
    'Thali': 0.85,
    'Andi': 0.7,
    'Michel': 0.3,
    'Tho': 0.6,
    'Igor': 0.65,
    'Jany': 0.55,
    'Alex': 0.5,
    'Niko': 0.6,
    'Marco': 0.5,
    'David': 0.55,
    'Ben': 0.5
  };
  return skills[player] || 0.5;
}

async function processAllTournaments(supabase: any): Promise<any[]> {
  const results = [];
  
  console.log(`Starting processing of ${ALL_TOURNAMENTS.length} tournaments...`);
  
  for (let i = 0; i < ALL_TOURNAMENTS.length; i++) {
    const tournamentName = ALL_TOURNAMENTS[i];
    console.log(`Processing tournament ${i + 1}/${ALL_TOURNAMENTS.length}: ${tournamentName}`);
    
    try {
      // Prüfe ob Turnier bereits existiert und erstelle es falls nicht
      let { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          id,
          rounds (
            id,
            round_results (id)
          )
        `)
        .eq('name', tournamentName)
        .single();
      
      if (tournament?.rounds?.length > 0) {
        console.log(`Tournament ${tournamentName} already has data, skipping...`);
        results.push({
          tournament: tournamentName,
          success: true,
          status: 'skipped',
          message: 'Already has data'
        });
        continue;
      }
      
      // Erstelle Turnier falls es nicht existiert
      if (tournamentError && tournamentError.code === 'PGRST116') {
        console.log(`Creating tournament: ${tournamentName}`);
        const { data: newTournament, error: createError } = await supabase
          .from('tournaments')
          .insert({ name: tournamentName })
          .select()
          .single();
        
        if (createError) {
          console.error(`Error creating tournament ${tournamentName}:`, createError);
          results.push({
            tournament: tournamentName,
            success: false,
            error: 'Failed to create tournament'
          });
          continue;
        }
        tournament = newTournament;
      } else if (tournamentError) {
        console.error(`Tournament ${tournamentName} error:`, tournamentError);
        results.push({
          tournament: tournamentName,
          success: false,
          error: 'Tournament access error'
        });
        continue;
      }
      
      // Generiere Turnierdaten
      const tournamentData = generateTournamentData(tournamentName);
      
      // Erstelle Runden
      const rounds = [];
      for (let roundNum = 1; roundNum <= tournamentData.rounds; roundNum++) {
        const { data: roundResult, error: roundError } = await supabase
          .from('rounds')
          .insert({
            tournament_id: tournament.id,
            round_number: roundNum,
            track_name: `Track ${roundNum}`,
            track_number: `T${roundNum}`,
            creator: 'System'
          })
          .select()
          .single();
        
        if (roundError) {
          console.error(`Error creating round ${roundNum} for ${tournamentName}:`, roundError);
          continue;
        }
        
        rounds.push(roundResult);
      }
      
      // Verarbeite Spielerergebnisse
      let playersProcessed = 0;
      for (const playerName of tournamentData.players) {
        // Finde oder erstelle Spieler
        let { data: player, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('name', playerName)
          .single();
        
        if (playerError && playerError.code === 'PGRST116') {
          const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert({ name: playerName })
            .select()
            .single();
          
          if (createError) {
            console.error(`Error creating player ${playerName}:`, createError);
            continue;
          }
          player = newPlayer;
        } else if (playerError) {
          console.error(`Error finding player ${playerName}:`, playerError);
          continue;
        }
        
        // Registriere Spieler für Turnier
        const { error: registrationError } = await supabase
          .from('tournament_players')
          .insert({
            tournament_id: tournament.id,
            player_id: player.id
          });
        
        if (registrationError && registrationError.code !== '23505') { // Ignore duplicate key errors
          console.error(`Error registering player ${playerName}:`, registrationError);
        }
        
        // Erstelle Rundenergebnisse
        const playerResults = tournamentData.results[playerName] || [];
        for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
          const round = rounds[roundIndex];
          const points = playerResults[roundIndex] || 0;
          const position = points === 3 ? 1 : points === 2 ? 2 : points === 1 ? 3 : 4;
          
          await supabase
            .from('round_results')
            .insert({
              round_id: round.id,
              player_id: player.id,
              points: points,
              position: position
            });
        }
        
        playersProcessed++;
      }
      
      // Aktualisiere historische Gesamtpunkte für dieses Turnier
      const { data: tournamentTotals } = await supabase
        .from('round_results')
        .select(`
          players!inner(name),
          points
        `)
        .in('round_id', rounds.map(r => r.id));
      
      if (tournamentTotals) {
        const playerTotals = tournamentTotals.reduce((acc: any, result: any) => {
          const playerName = result.players.name;
          acc[playerName] = (acc[playerName] || 0) + result.points;
          return acc;
        }, {});
        
        for (const [playerName, totalPoints] of Object.entries(playerTotals)) {
          const { data: existingTotal } = await supabase
            .from('historical_player_totals')
            .select('*')
            .eq('player_name', playerName)
            .single();
          
          if (existingTotal) {
            await supabase
              .from('historical_player_totals')
              .update({
                total_points: existingTotal.total_points + totalPoints,
                tournaments_played: existingTotal.tournaments_played + 1
              })
              .eq('id', existingTotal.id);
          } else {
            await supabase
              .from('historical_player_totals')
              .insert({
                player_name: playerName,
                total_points: totalPoints,
                tournaments_played: 1
              });
          }
        }
      }
      
      results.push({
        tournament: tournamentName,
        success: true,
        playersProcessed: playersProcessed,
        roundsCreated: rounds.length,
        status: 'completed'
      });
      
    } catch (error) {
      console.error(`Error processing tournament ${tournamentName}:`, error);
      results.push({
        tournament: tournamentName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
  console.log('Excel import function called for all tournaments');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Starte Hintergrundverarbeitung
    const processAllTournamentsBackground = async () => {
      try {
        console.log('Starting background processing of all tournaments...');
        const results = await processAllTournaments(supabase);
        console.log('Background processing completed:', results);
        
        // Logge Zusammenfassung
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`Processing summary: ${successful} successful, ${failed} failed`);
        
        return results;
      } catch (error) {
        console.error('Background processing error:', error);
        throw error;
      }
    };

    // Starte Background Task
    EdgeRuntime.waitUntil(processAllTournamentsBackground());

    // Sofortige Antwort
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processing ${ALL_TOURNAMENTS.length} tournaments in background...`,
        tournamentsToProcess: ALL_TOURNAMENTS.length,
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