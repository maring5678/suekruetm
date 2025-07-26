-- Lösche falsche Spieler die nie mitgespielt haben
-- Zuerst ihre round_results löschen
DELETE FROM round_results 
WHERE player_id IN (
    SELECT id FROM players WHERE name IN ('Niko', 'Marco', 'Jany')
);

-- Dann ihre tournament_players Einträge löschen  
DELETE FROM tournament_players 
WHERE player_id IN (
    SELECT id FROM players WHERE name IN ('Niko', 'Marco', 'Jany')
);

-- Dann die historical_player_totals Einträge löschen
DELETE FROM historical_player_totals 
WHERE player_name IN ('Niko', 'Marco', 'Jany');

-- Schließlich die falschen Spieler selbst löschen
DELETE FROM players WHERE name IN ('Niko', 'Marco', 'Jany');