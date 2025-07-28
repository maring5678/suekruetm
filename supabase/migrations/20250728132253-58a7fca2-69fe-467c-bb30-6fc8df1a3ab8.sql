-- Lösche alle bisherigen Import-Daten für einen sauberen Neustart

-- 1. Lösche Round Results
DELETE FROM round_results;

-- 2. Lösche Tournament Players
DELETE FROM tournament_players;

-- 3. Lösche Rounds
DELETE FROM rounds;

-- 4. Lösche Tournaments
DELETE FROM tournaments;

-- 5. Lösche Historical Player Totals (aus alten CSV-Importen)
DELETE FROM historical_player_totals;

-- 6. Lösche alle Spieler (werden beim neuen Import neu erstellt)
DELETE FROM players;