-- Lösche alle historischen Daten und erstelle sie neu basierend auf ECHTEN Teilnahmen
TRUNCATE TABLE historical_player_totals;

-- Erstelle historische Daten nur für Spieler die WIRKLICH an Turnieren teilgenommen haben
-- (basierend auf tournament_players Tabelle)
INSERT INTO historical_player_totals (player_name, total_points, tournaments_played)
SELECT 
    p.name as player_name,
    COALESCE(SUM(rr.points), 0) as total_points,
    COUNT(DISTINCT tp.tournament_id) as tournaments_played
FROM players p
INNER JOIN tournament_players tp ON p.id = tp.player_id  -- Nur Spieler die registriert sind
INNER JOIN tournaments t ON tp.tournament_id = t.id AND t.completed_at IS NOT NULL  -- Nur abgeschlossene Turniere
LEFT JOIN rounds r ON t.id = r.tournament_id
LEFT JOIN round_results rr ON p.id = rr.player_id AND r.id = rr.round_id
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT tp.tournament_id) > 0  -- Mindestens 1 Turnier gespielt
ORDER BY total_points DESC;