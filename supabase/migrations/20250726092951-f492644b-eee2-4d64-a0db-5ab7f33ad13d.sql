-- Migration für historische Trackmania-Daten (korrigierte Spielernamen)
-- Importiert die echten Spieler aus der Excel-Datei

-- Unique Constraint für Spielernamen hinzufügen
ALTER TABLE public.players ADD CONSTRAINT players_name_unique UNIQUE (name);

-- Alle echten Spieler aus der Excel-Datei einfügen
INSERT INTO public.players (name) VALUES
('Felix W'),
('Thali'),
('Tho'),
('Andi'),
('Michel'),
('Igor'),
('Felix'),
('Dani'),
('Yve'),
('Peter'),
('Marv'),
('Rochen'),
('Mikey'),
('Phil'),
('Jana'),
('Grischa'),
('Alex'),
('Steffen'),
('Franz'),
('Andi G')
ON CONFLICT (name) DO NOTHING;

-- Historische Turniere für verschiedene Spieltage erstellen
INSERT INTO public.tournaments (name, created_at, completed_at) VALUES
('Historischer Spieltag 1', '2024-01-15 18:00:00', '2024-01-15 22:00:00'),
('Historischer Spieltag 2', '2024-02-12 18:00:00', '2024-02-12 22:00:00'),
('Historischer Spieltag 3', '2024-03-10 18:00:00', '2024-03-10 22:00:00'),
('Historischer Spieltag 4', '2024-04-07 18:00:00', '2024-04-07 22:00:00'),
('Historischer Spieltag 5', '2024-05-05 18:00:00', '2024-05-05 22:00:00'),
('Historischer Spieltag 6', '2024-06-02 18:00:00', '2024-06-02 22:00:00'),
('Historischer Spieltag 7', '2024-07-07 18:00:00', '2024-07-07 22:00:00'),
('Historischer Spieltag 8', '2024-08-04 18:00:00', '2024-08-04 22:00:00'),
('Historischer Spieltag 9', '2024-09-01 18:00:00', '2024-09-01 22:00:00'),
('Historischer Spieltag 10', '2024-09-29 18:00:00', '2024-09-29 22:00:00')
ON CONFLICT (name) DO NOTHING;

-- Tabelle für historische Gesamtpunkte pro Spieler
CREATE TABLE IF NOT EXISTS public.historical_player_totals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  tournaments_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.historical_player_totals ENABLE ROW LEVEL SECURITY;

-- Policies erstellen
CREATE POLICY "Jeder kann historische Gesamtpunkte anzeigen"
ON public.historical_player_totals
FOR SELECT
USING (true);

CREATE POLICY "Jeder kann historische Gesamtpunkte erstellen"
ON public.historical_player_totals
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Jeder kann historische Gesamtpunkte aktualisieren"
ON public.historical_player_totals
FOR UPDATE
USING (true);

-- Spieler mit 0 Punkten initialisieren
INSERT INTO public.historical_player_totals (player_name, total_points, tournaments_played) VALUES
('Felix W', 0, 0),
('Thali', 0, 0),
('Tho', 0, 0),
('Andi', 0, 0),
('Michel', 0, 0),
('Igor', 0, 0),
('Felix', 0, 0),
('Dani', 0, 0),
('Yve', 0, 0),
('Peter', 0, 0),
('Marv', 0, 0),
('Rochen', 0, 0),
('Mikey', 0, 0),
('Phil', 0, 0),
('Jana', 0, 0),
('Grischa', 0, 0),
('Alex', 0, 0),
('Steffen', 0, 0),
('Franz', 0, 0),
('Andi G', 0, 0)
ON CONFLICT (player_name) DO NOTHING;