-- Entferne ungültige Spieler (Zeilennummern)
DELETE FROM round_results WHERE player_id IN (SELECT id FROM players WHERE name LIKE '%.' AND LENGTH(name) <= 3);
DELETE FROM tournament_players WHERE player_id IN (SELECT id FROM players WHERE name LIKE '%.' AND LENGTH(name) <= 3);
DELETE FROM players WHERE name LIKE '%.' AND LENGTH(name) <= 3;