-- Trackmania Excel-Daten Migration - Schritt 1: Turniere erstellen

-- Zuerst löschen wir die bestehenden historischen Turniere
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

-- Runden für Spieltag 24.02.25 erstellen
INSERT INTO public.rounds (tournament_id, round_number, track_name, track_number, creator)
SELECT t.id, 1, 'PBS12', 'PBS12', 'System'
FROM public.tournaments t
WHERE t.name = 'Spieltag 24.02.25'

UNION ALL

SELECT t.id, 2, 'NK542', 'NK542', 'System'
FROM public.tournaments t
WHERE t.name = 'Spieltag 24.02.25'

UNION ALL

SELECT t.id, 3, 'DS123', 'DS123', 'System'
FROM public.tournaments t
WHERE t.name = 'Spieltag 24.02.25'

UNION ALL

SELECT t.id, 4, 'LG162', 'LG162', 'System'
FROM public.tournaments t
WHERE t.name = 'Spieltag 24.02.25'

UNION ALL

SELECT t.id, 5, 'DS114', 'DS114', 'System'
FROM public.tournaments t
WHERE t.name = 'Spieltag 24.02.25';