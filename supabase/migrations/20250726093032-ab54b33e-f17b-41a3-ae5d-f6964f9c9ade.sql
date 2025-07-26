-- Migration für historische Trackmania-Daten (korrigierte Spielernamen)
-- Importiert die echten Spieler aus der Excel-Datei

-- Alle echten Spieler direkt einfügen (falls sie noch nicht existieren)
DO $$ 
DECLARE
    player_names TEXT[] := ARRAY[
        'Felix W', 'Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix', 
        'Dani', 'Yve', 'Peter', 'Marv', 'Rochen', 'Mikey', 'Phil', 
        'Jana', 'Grischa', 'Alex', 'Steffen', 'Franz', 'Andi G'
    ];
    player_name TEXT;
BEGIN
    FOREACH player_name IN ARRAY player_names
    LOOP
        INSERT INTO public.players (name) 
        SELECT player_name 
        WHERE NOT EXISTS (SELECT 1 FROM public.players WHERE name = player_name);
    END LOOP;
END $$;

-- Historische Turniere für verschiedene Spieltage erstellen (falls sie noch nicht existieren)
INSERT INTO public.tournaments (name, created_at, completed_at)
SELECT * FROM (VALUES
    ('Historischer Spieltag 1', '2024-01-15 18:00:00'::timestamp, '2024-01-15 22:00:00'::timestamp),
    ('Historischer Spieltag 2', '2024-02-12 18:00:00'::timestamp, '2024-02-12 22:00:00'::timestamp),
    ('Historischer Spieltag 3', '2024-03-10 18:00:00'::timestamp, '2024-03-10 22:00:00'::timestamp),
    ('Historischer Spieltag 4', '2024-04-07 18:00:00'::timestamp, '2024-04-07 22:00:00'::timestamp),
    ('Historischer Spieltag 5', '2024-05-05 18:00:00'::timestamp, '2024-05-05 22:00:00'::timestamp),
    ('Historischer Spieltag 6', '2024-06-02 18:00:00'::timestamp, '2024-06-02 22:00:00'::timestamp),
    ('Historischer Spieltag 7', '2024-07-07 18:00:00'::timestamp, '2024-07-07 22:00:00'::timestamp),
    ('Historischer Spieltag 8', '2024-08-04 18:00:00'::timestamp, '2024-08-04 22:00:00'::timestamp),
    ('Historischer Spieltag 9', '2024-09-01 18:00:00'::timestamp, '2024-09-01 22:00:00'::timestamp),
    ('Historischer Spieltag 10', '2024-09-29 18:00:00'::timestamp, '2024-09-29 22:00:00'::timestamp)
) AS v(name, created_at, completed_at)
WHERE NOT EXISTS (SELECT 1 FROM public.tournaments WHERE tournaments.name = v.name);

-- Tabelle für historische Gesamtpunkte pro Spieler (falls sie noch nicht existiert)
CREATE TABLE IF NOT EXISTS public.historical_player_totals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  tournaments_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren (falls noch nicht aktiviert)
ALTER TABLE public.historical_player_totals ENABLE ROW LEVEL SECURITY;

-- Policies erstellen (falls sie noch nicht existieren)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'historical_player_totals' AND policyname = 'Jeder kann historische Gesamtpunkte anzeigen') THEN
        CREATE POLICY "Jeder kann historische Gesamtpunkte anzeigen"
        ON public.historical_player_totals
        FOR SELECT
        USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'historical_player_totals' AND policyname = 'Jeder kann historische Gesamtpunkte erstellen') THEN
        CREATE POLICY "Jeder kann historische Gesamtpunkte erstellen"
        ON public.historical_player_totals
        FOR INSERT
        WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'historical_player_totals' AND policyname = 'Jeder kann historische Gesamtpunkte aktualisieren') THEN
        CREATE POLICY "Jeder kann historische Gesamtpunkte aktualisieren"
        ON public.historical_player_totals
        FOR UPDATE
        USING (true);
    END IF;
END $$;

-- Spieler mit 0 Punkten initialisieren (falls sie noch nicht existieren)
DO $$ 
DECLARE
    player_names TEXT[] := ARRAY[
        'Felix W', 'Thali', 'Tho', 'Andi', 'Michel', 'Igor', 'Felix', 
        'Dani', 'Yve', 'Peter', 'Marv', 'Rochen', 'Mikey', 'Phil', 
        'Jana', 'Grischa', 'Alex', 'Steffen', 'Franz', 'Andi G'
    ];
    player_name TEXT;
BEGIN
    FOREACH player_name IN ARRAY player_names
    LOOP
        INSERT INTO public.historical_player_totals (player_name, total_points, tournaments_played) 
        SELECT player_name, 0, 0
        WHERE NOT EXISTS (SELECT 1 FROM public.historical_player_totals WHERE historical_player_totals.player_name = player_name);
    END LOOP;
END $$;