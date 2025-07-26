-- Beispiel-Auswertung für 21.08.22 basierend auf dem Punktesystem
-- Erstelle 5 Runden für das erste Turnier

WITH tournament_21_08_22 AS (
  SELECT id FROM tournaments WHERE name = '21.08.22'
),
example_rounds AS (
  INSERT INTO rounds (tournament_id, round_number, track_name, track_number, creator)
  SELECT 
    t.id,
    generate_series(1, 5) as round_number,
    'Track ' || generate_series(1, 5) as track_name,
    'T' || generate_series(1, 5) as track_number,
    'System' as creator
  FROM tournament_21_08_22 t
  RETURNING id, round_number
),
-- Beispiel-Ergebnisse für das 21.08.22 Turnier
example_results AS (
  VALUES
    ('Felix', 1, 3), ('Felix', 2, 2), ('Felix', 3, 3), ('Felix', 4, 1), ('Felix', 5, 3),
    ('Thali', 1, 2), ('Thali', 2, 3), ('Thali', 3, 2), ('Thali', 4, 3), ('Thali', 5, 1),
    ('Andi', 1, 1), ('Andi', 2, 1), ('Andi', 3, 1), ('Andi', 4, 2), ('Andi', 5, 2),
    ('Michel', 1, 0), ('Michel', 2, 0), ('Michel', 3, 0), ('Michel', 4, 0), ('Michel', 5, 0),
    ('Tho', 1, 0), ('Tho', 2, 2), ('Tho', 3, 0), ('Tho', 4, 1), ('Tho', 5, 1),
    ('Igor', 1, 1), ('Igor', 2, 0), ('Igor', 3, 1), ('Igor', 4, 0), ('Igor', 5, 2),
    ('Jany', 1, 0), ('Jany', 2, 1), ('Jany', 3, 0), ('Jany', 4, 2), ('Jany', 5, 0),
    ('Alex', 1, 2), ('Alex', 2, 0), ('Alex', 3, 2), ('Alex', 4, 0), ('Alex', 5, 0)
)
INSERT INTO round_results (round_id, player_id, points, position)
SELECT 
  r.id as round_id,
  p.id as player_id,
  e.points,
  CASE e.points
    WHEN 3 THEN 1
    WHEN 2 THEN 2
    WHEN 1 THEN 3
    ELSE 4
  END as position
FROM example_results e(player_name, round_num, points)
JOIN players p ON p.name = e.player_name
JOIN example_rounds r ON r.round_number = e.round_num;

-- Berechne und aktualisiere die historischen Gesamtpunkte für dieses Turnier
WITH player_totals AS (
  SELECT 
    p.name as player_name,
    SUM(rr.points) as total_points
  FROM round_results rr
  JOIN rounds r ON rr.round_id = r.id
  JOIN tournaments t ON r.tournament_id = t.id
  JOIN players p ON rr.player_id = p.id
  WHERE t.name = '21.08.22'
  GROUP BY p.name
)
INSERT INTO historical_player_totals (player_name, total_points, tournaments_played)
SELECT 
  player_name,
  total_points,
  1 as tournaments_played
FROM player_totals
ON CONFLICT (player_name) DO UPDATE SET
  total_points = historical_player_totals.total_points + EXCLUDED.total_points,
  tournaments_played = historical_player_totals.tournaments_played + 1;