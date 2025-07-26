-- Korrigiere die historical_player_totals mit den echten Daten
TRUNCATE TABLE historical_player_totals;

-- Füge korrekte historische Daten ein basierend auf tatsächlichen round_results
INSERT INTO historical_player_totals (player_name, total_points, tournaments_played)
SELECT 
    p.name as player_name,
    COALESCE(SUM(rr.points), 0) as total_points,
    COUNT(DISTINCT tp.tournament_id) as tournaments_played
FROM players p
LEFT JOIN tournament_players tp ON p.id = tp.player_id
LEFT JOIN round_results rr ON p.id = rr.player_id
WHERE tp.tournament_id IS NOT NULL
GROUP BY p.id, p.name
ORDER BY total_points DESC;