-- Schritt 2: Ergebnisse für Spieltag 24.02.25 basierend auf Excel-Daten

-- Ergebnisse für Runde 1 (PBS12)
INSERT INTO public.round_results (round_id, player_id, position, points)
SELECT r.id, p.id, 1, 2
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Thali'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 1

UNION ALL

SELECT r.id, p.id, 2, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Tho'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 1

UNION ALL

SELECT r.id, p.id, 3, 1
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Andi'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 1

UNION ALL

SELECT r.id, p.id, 4, 3
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Michel'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 1

UNION ALL

SELECT r.id, p.id, 5, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Felix'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 1

UNION ALL

-- Ergebnisse für Runde 2 (NK542)
SELECT r.id, p.id, 1, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Thali'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 2

UNION ALL

SELECT r.id, p.id, 2, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Tho'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 2

UNION ALL

SELECT r.id, p.id, 3, 3
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Andi'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 2

UNION ALL

SELECT r.id, p.id, 4, 1
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Michel'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 2

UNION ALL

SELECT r.id, p.id, 5, 2
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Igor'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 2

UNION ALL

SELECT r.id, p.id, 6, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Felix'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 2

UNION ALL

-- Ergebnisse für Runde 3 (DS123)
SELECT r.id, p.id, 1, 2
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Thali'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 3

UNION ALL

SELECT r.id, p.id, 2, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Tho'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 3

UNION ALL

SELECT r.id, p.id, 3, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Andi'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 3

UNION ALL

SELECT r.id, p.id, 4, 1
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Michel'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 3

UNION ALL

SELECT r.id, p.id, 5, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Igor'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 3

UNION ALL

SELECT r.id, p.id, 6, 3
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Felix'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 3

UNION ALL

-- Ergebnisse für Runde 4 (LG162)
SELECT r.id, p.id, 1, 1
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Thali'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 4

UNION ALL

SELECT r.id, p.id, 2, 3
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Tho'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 4

UNION ALL

SELECT r.id, p.id, 3, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Andi'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 4

UNION ALL

SELECT r.id, p.id, 4, 2
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Felix'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 4

UNION ALL

-- Ergebnisse für Runde 5 (DS114)
SELECT r.id, p.id, 1, 0
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Thali'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 5

UNION ALL

SELECT r.id, p.id, 2, 1
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Andi'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 5

UNION ALL

SELECT r.id, p.id, 3, 3
FROM public.rounds r
JOIN public.tournaments t ON r.tournament_id = t.id
JOIN public.players p ON p.name = 'Felix'
WHERE t.name = 'Spieltag 24.02.25' AND r.round_number = 5;

-- Turnier-Teilnehmer registrieren
INSERT INTO public.tournament_players (tournament_id, player_id)
SELECT t.id, p.id
FROM public.tournaments t
CROSS JOIN public.players p
WHERE t.name = 'Spieltag 24.02.25' 
AND p.name IN ('Felix W', 'Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix');

-- Historische Gesamtpunkte aktualisieren
UPDATE public.historical_player_totals 
SET total_points = CASE player_name
  WHEN 'Thali' THEN 5   -- 2+0+2+1+0 = 5
  WHEN 'Tho' THEN 3     -- 0+0+0+3+0 = 3
  WHEN 'Andi' THEN 5    -- 1+3+0+0+1 = 5
  WHEN 'Michel' THEN 5  -- 3+1+1+0+0 = 5
  WHEN 'Igor' THEN 2    -- 0+2+0+0+0 = 2
  WHEN 'Felix' THEN 8   -- 0+0+3+2+3 = 8
  ELSE total_points
END,
tournaments_played = 1
WHERE player_name IN ('Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix');