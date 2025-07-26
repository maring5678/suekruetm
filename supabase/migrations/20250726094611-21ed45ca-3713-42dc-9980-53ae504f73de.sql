-- Trackmania Excel-Daten Migration - Jedes Blatt als separates Turnier

-- Zuerst löschen wir die bestehenden historischen Turniere und erstellen sie neu mit korrekten Daten
DELETE FROM public.tournaments WHERE name LIKE 'Historischer Spieltag%';

-- Turniere basierend auf den Excel-Blättern erstellen
INSERT INTO public.tournaments (name, created_at, completed_at) VALUES
('Spieltag 24.02.25', '2025-02-24 18:00:00'::timestamp, '2025-02-24 22:00:00'::timestamp),
('Spieltag 03.03.25', '2025-03-03 18:00:00'::timestamp, '2025-03-03 22:00:00'::timestamp),
('Spieltag 10.03.25', '2025-03-10 18:00:00'::timestamp, '2025-03-10 22:00:00'::timestamp),
('Spieltag 17.03.25', '2025-03-17 18:00:00'::timestamp, '2025-03-17 22:00:00'::timestamp),
('Spieltag 24.03.25', '2025-03-24 18:00:00'::timestamp, '2025-03-24 22:00:00'::timestamp),
('Spieltag 06.04.25', '2025-04-06 18:00:00'::timestamp, '2025-04-06 22:00:00'::timestamp),
('Spieltag 14.04.25', '2025-04-14 18:00:00'::timestamp, '2025-04-14 22:00:00'::timestamp),
('Spieltag 21.04.25', '2025-04-21 18:00:00'::timestamp, '2025-04-21 22:00:00'::timestamp),
('Spieltag 12.05.25', '2025-05-12 18:00:00'::timestamp, '2025-05-12 22:00:00'::timestamp),
('Spieltag 19.05.25', '2025-05-19 18:00:00'::timestamp, '2025-05-19 22:00:00'::timestamp);

-- Basierend auf der sichtbaren Excel-Tabelle - Runden und Ergebnisse für das erste sichtbare Blatt
-- Spieltag 24.02.25 (aktuell sichtbares Blatt)
WITH tournament_24_02 AS (
  SELECT id FROM public.tournaments WHERE name = 'Spieltag 24.02.25'
),
round_pbs12 AS (
  INSERT INTO public.rounds (tournament_id, round_number, track_name, track_number, creator)
  SELECT t.id, 1, 'PBS12', 'PBS12', 'System'
  FROM tournament_24_02 t
  RETURNING id
),
round_nk542 AS (
  INSERT INTO public.rounds (tournament_id, round_number, track_name, track_number, creator)
  SELECT t.id, 2, 'NK542', 'NK542', 'System'
  FROM tournament_24_02 t
  RETURNING id
),
round_ds123 AS (
  INSERT INTO public.rounds (tournament_id, round_number, track_name, track_number, creator)
  SELECT t.id, 3, 'DS123', 'DS123', 'System'
  FROM tournament_24_02 t
  RETURNING id
),
round_lg162 AS (
  INSERT INTO public.rounds (tournament_id, round_number, track_name, track_number, creator)
  SELECT t.id, 4, 'LG162', 'LG162', 'System'
  FROM tournament_24_02 t
  RETURNING id
),
round_ds114 AS (
  INSERT INTO public.rounds (tournament_id, round_number, track_name, track_number, creator)
  SELECT t.id, 5, 'DS114', 'DS114', 'System'
  FROM tournament_24_02 t
  RETURNING id
)

-- Ergebnisse für die Runden einfügen basierend auf den sichtbaren Daten
-- Round PBS12 (Runde 1)
INSERT INTO public.round_results (round_id, player_id, position, points)
SELECT r.id, p.id, 
  CASE p.name 
    WHEN 'Thali' THEN 1
    WHEN 'Tho' THEN 2
    WHEN 'Andi' THEN 3
    WHEN 'Michel' THEN 4
    WHEN 'Felix' THEN 5
    ELSE 6
  END as position,
  CASE p.name 
    WHEN 'Thali' THEN 2
    WHEN 'Tho' THEN 0
    WHEN 'Andi' THEN 1
    WHEN 'Michel' THEN 3
    WHEN 'Felix' THEN 0
    ELSE 0
  END as points
FROM round_pbs12 r
CROSS JOIN public.players p
WHERE p.name IN ('Thali', 'Tho', 'Andi', 'Michel', 'Felix')

UNION ALL

-- Round NK542 (Runde 2)
SELECT r.id, p.id,
  CASE p.name 
    WHEN 'Thali' THEN 1
    WHEN 'Tho' THEN 2  
    WHEN 'Andi' THEN 3
    WHEN 'Michel' THEN 4
    WHEN 'Igor' THEN 5
    WHEN 'Felix' THEN 6
    ELSE 7
  END as position,
  CASE p.name 
    WHEN 'Thali' THEN 0
    WHEN 'Tho' THEN 0
    WHEN 'Andi' THEN 3
    WHEN 'Michel' THEN 1
    WHEN 'Igor' THEN 2
    WHEN 'Felix' THEN 0
    ELSE 0
  END as points
FROM round_nk542 r
CROSS JOIN public.players p
WHERE p.name IN ('Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix')

UNION ALL

-- Round DS123 (Runde 3)  
SELECT r.id, p.id,
  CASE p.name 
    WHEN 'Thali' THEN 1
    WHEN 'Tho' THEN 2
    WHEN 'Andi' THEN 3
    WHEN 'Michel' THEN 4
    WHEN 'Igor' THEN 5
    WHEN 'Felix' THEN 6
    ELSE 7
  END as position,
  CASE p.name 
    WHEN 'Thali' THEN 2
    WHEN 'Tho' THEN 0
    WHEN 'Andi' THEN 0
    WHEN 'Michel' THEN 1
    WHEN 'Igor' THEN 0
    WHEN 'Felix' THEN 3
    ELSE 0
  END as points
FROM round_ds123 r
CROSS JOIN public.players p
WHERE p.name IN ('Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix')

UNION ALL

-- Round LG162 (Runde 4)
SELECT r.id, p.id,
  CASE p.name 
    WHEN 'Thali' THEN 1
    WHEN 'Tho' THEN 2
    WHEN 'Andi' THEN 3
    WHEN 'Felix' THEN 4
    ELSE 5
  END as position,
  CASE p.name 
    WHEN 'Thali' THEN 1
    WHEN 'Tho' THEN 3
    WHEN 'Andi' THEN 0
    WHEN 'Felix' THEN 2
    ELSE 0
  END as points
FROM round_lg162 r
CROSS JOIN public.players p
WHERE p.name IN ('Thali', 'Tho', 'Andi', 'Felix')

UNION ALL

-- Round DS114 (Runde 5)
SELECT r.id, p.id,
  CASE p.name 
    WHEN 'Thali' THEN 1
    WHEN 'Andi' THEN 2
    WHEN 'Felix' THEN 3
    ELSE 4
  END as position,
  CASE p.name 
    WHEN 'Thali' THEN 0
    WHEN 'Andi' THEN 1
    WHEN 'Felix' THEN 3
    ELSE 0
  END as points
FROM round_ds114 r
CROSS JOIN public.players p
WHERE p.name IN ('Thali', 'Andi', 'Felix');

-- Turnier-Teilnehmer registrieren
INSERT INTO public.tournament_players (tournament_id, player_id)
SELECT t.id, p.id
FROM tournament_24_02 t
CROSS JOIN public.players p
WHERE p.name IN ('Felix W', 'Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix');

-- Historische Gesamtpunkte aktualisieren basierend auf den sichtbaren Summen
UPDATE public.historical_player_totals 
SET total_points = CASE player_name
  WHEN 'Felix W' THEN 0
  WHEN 'Thali' THEN 5  -- 2+0+2+1+0
  WHEN 'Tho' THEN 3    -- 0+0+0+3+0  
  WHEN 'Andi' THEN 5   -- 1+3+0+0+1
  WHEN 'Michel' THEN 5 -- 3+1+1+0+0
  WHEN 'Igor' THEN 2   -- 0+2+0+0+0
  WHEN 'Felix' THEN 8  -- 0+0+3+2+3
  ELSE 0
END,
tournaments_played = 1
WHERE player_name IN ('Felix W', 'Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix');