import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExcelRowData {
  playerName: string;
  rounds: { [roundName: string]: number };
  totalPoints: number;
}

interface TournamentData {
  name: string;
  date: string;
  players: ExcelRowData[];
}

Deno.serve(async (req) => {
  console.log('Excel import function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tournamentData } = await req.json();
    console.log('Processing tournament data:', tournamentData);

    if (!tournamentData || !Array.isArray(tournamentData)) {
      throw new Error('Invalid tournament data format');
    }

    const results = [];

    for (const tournament of tournamentData as TournamentData[]) {
      console.log(`Processing tournament: ${tournament.name}`);

      // Create tournament
      const { data: tournamentResult, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: tournament.name,
          created_at: tournament.date,
          completed_at: tournament.date.replace('18:00:00', '22:00:00')
        })
        .select()
        .single();

      if (tournamentError) {
        console.error(`Error creating tournament ${tournament.name}:`, tournamentError);
        continue;
      }

      console.log(`Created tournament: ${tournamentResult.id}`);

      // Get round names from first player's data
      const roundNames = Object.keys(tournament.players[0]?.rounds || {});
      const rounds = [];

      // Create rounds
      for (let i = 0; i < roundNames.length; i++) {
        const roundName = roundNames[i];
        const { data: roundResult, error: roundError } = await supabase
          .from('rounds')
          .insert({
            tournament_id: tournamentResult.id,
            round_number: i + 1,
            track_name: roundName,
            track_number: roundName,
            creator: 'System'
          })
          .select()
          .single();

        if (roundError) {
          console.error(`Error creating round ${roundName}:`, roundError);
          continue;
        }

        rounds.push(roundResult);
      }

      // Process players and results
      for (const playerData of tournament.players) {
        // Find or create player
        let { data: player, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('name', playerData.playerName)
          .single();

        if (playerError && playerError.code === 'PGRST116') {
          // Player doesn't exist, create it
          const { data: newPlayer, error: createPlayerError } = await supabase
            .from('players')
            .insert({ name: playerData.playerName })
            .select()
            .single();

          if (createPlayerError) {
            console.error(`Error creating player ${playerData.playerName}:`, createPlayerError);
            continue;
          }
          player = newPlayer;
        } else if (playerError) {
          console.error(`Error finding player ${playerData.playerName}:`, playerError);
          continue;
        }

        // Register player for tournament
        await supabase
          .from('tournament_players')
          .insert({
            tournament_id: tournamentResult.id,
            player_id: player.id
          });

        // Create round results
        for (let i = 0; i < rounds.length; i++) {
          const round = rounds[i];
          const roundName = roundNames[i];
          const points = playerData.rounds[roundName] || 0;

          await supabase
            .from('round_results')
            .insert({
              round_id: round.id,
              player_id: player.id,
              position: 1, // We'll calculate this based on points
              points: points
            });
        }

        // Update historical totals
        const { data: existingTotal } = await supabase
          .from('historical_player_totals')
          .select('*')
          .eq('player_name', playerData.playerName)
          .single();

        if (existingTotal) {
          await supabase
            .from('historical_player_totals')
            .update({
              total_points: existingTotal.total_points + playerData.totalPoints,
              tournaments_played: existingTotal.tournaments_played + 1
            })
            .eq('id', existingTotal.id);
        } else {
          await supabase
            .from('historical_player_totals')
            .insert({
              player_name: playerData.playerName,
              total_points: playerData.totalPoints,
              tournaments_played: 1
            });
        }
      }

      results.push({
        tournament: tournament.name,
        success: true,
        playersProcessed: tournament.players.length,
        roundsCreated: rounds.length
      });
    }

    console.log('Import completed:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
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