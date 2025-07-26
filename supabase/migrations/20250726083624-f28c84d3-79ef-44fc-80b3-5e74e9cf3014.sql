-- Erstelle Turniere-Tabelle
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Erstelle Spieler-Tabelle
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Erstelle Turnier-Spieler-Verknüpfungstabelle
CREATE TABLE public.tournament_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

-- Erstelle Runden-Tabelle
CREATE TABLE public.rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  track_name TEXT NOT NULL,
  track_number TEXT NOT NULL,
  creator TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, round_number)
);

-- Erstelle Rundenergebnisse-Tabelle
CREATE TABLE public.round_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);

-- Aktiviere Row Level Security
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;

-- Erstelle öffentliche Richtlinien (da keine Authentifizierung verwendet wird)
CREATE POLICY "Jeder kann Turniere anzeigen" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Jeder kann Turniere erstellen" ON public.tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Jeder kann Turniere aktualisieren" ON public.tournaments FOR UPDATE USING (true);

CREATE POLICY "Jeder kann Spieler anzeigen" ON public.players FOR SELECT USING (true);
CREATE POLICY "Jeder kann Spieler erstellen" ON public.players FOR INSERT WITH CHECK (true);

CREATE POLICY "Jeder kann Turnier-Spieler anzeigen" ON public.tournament_players FOR SELECT USING (true);
CREATE POLICY "Jeder kann Turnier-Spieler erstellen" ON public.tournament_players FOR INSERT WITH CHECK (true);

CREATE POLICY "Jeder kann Runden anzeigen" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Jeder kann Runden erstellen" ON public.rounds FOR INSERT WITH CHECK (true);

CREATE POLICY "Jeder kann Rundenergebnisse anzeigen" ON public.round_results FOR SELECT USING (true);
CREATE POLICY "Jeder kann Rundenergebnisse erstellen" ON public.round_results FOR INSERT WITH CHECK (true);

-- Erstelle Indizes für bessere Performance
CREATE INDEX idx_tournament_players_tournament_id ON public.tournament_players(tournament_id);
CREATE INDEX idx_tournament_players_player_id ON public.tournament_players(player_id);
CREATE INDEX idx_rounds_tournament_id ON public.rounds(tournament_id);
CREATE INDEX idx_round_results_round_id ON public.round_results(round_id);
CREATE INDEX idx_round_results_player_id ON public.round_results(player_id);