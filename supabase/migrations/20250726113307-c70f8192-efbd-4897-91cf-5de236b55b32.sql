-- Lösche alle importierten Daten komplett
-- Reihenfolge ist wichtig wegen Foreign Keys

-- 1. Lösche alle round_results
DELETE FROM round_results;

-- 2. Lösche alle rounds  
DELETE FROM rounds;

-- 3. Lösche alle tournament_players
DELETE FROM tournament_players;

-- 4. Lösche alle historical_player_totals
DELETE FROM historical_player_totals;

-- 5. Lösche alle tournaments
DELETE FROM tournaments;

-- 6. Lösche alle players
DELETE FROM players;

-- Bestätige dass alles gelöscht wurde
SELECT 'tournaments' as tabelle, COUNT(*) as anzahl FROM tournaments
UNION ALL
SELECT 'players', COUNT(*) FROM players  
UNION ALL
SELECT 'rounds', COUNT(*) FROM rounds
UNION ALL  
SELECT 'round_results', COUNT(*) FROM round_results
UNION ALL
SELECT 'tournament_players', COUNT(*) FROM tournament_players
UNION ALL
SELECT 'historical_player_totals', COUNT(*) FROM historical_player_totals;