-- Reset tournament data while keeping players
-- Delete in correct order to avoid foreign key constraint issues

-- Delete round results first (references rounds)
DELETE FROM public.round_results;

-- Delete rounds (references tournaments)
DELETE FROM public.rounds;

-- Delete tournament players (references tournaments and players)
DELETE FROM public.tournament_players;

-- Delete tournaments
DELETE FROM public.tournaments;

-- Delete historical player totals to reset all statistics
DELETE FROM public.historical_player_totals;

-- Reset any sequences if needed (optional, keeps IDs clean)
-- Note: UUIDs don't use sequences, so this is not needed for this schema