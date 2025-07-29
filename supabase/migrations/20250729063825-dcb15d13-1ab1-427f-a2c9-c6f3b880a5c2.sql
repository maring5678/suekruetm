-- Tabelle für Spieler-Favoriten erstellen
CREATE TABLE public.player_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.player_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies für Favoriten (jeder kann Favoriten sehen und verwalten)
CREATE POLICY "Jeder kann Favoriten anzeigen" 
ON public.player_favorites 
FOR SELECT 
USING (true);

CREATE POLICY "Jeder kann Favoriten erstellen" 
ON public.player_favorites 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Jeder kann Favoriten löschen" 
ON public.player_favorites 
FOR DELETE 
USING (true);

-- Index für bessere Performance
CREATE INDEX idx_player_favorites_player_id ON public.player_favorites(player_id);

-- Update players table um UPDATE zu erlauben (für zukünftige Features)
DROP POLICY IF EXISTS "Jeder kann Spieler aktualisieren" ON public.players;
CREATE POLICY "Jeder kann Spieler aktualisieren" 
ON public.players 
FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Jeder kann Spieler löschen" ON public.players;
CREATE POLICY "Jeder kann Spieler löschen" 
ON public.players 
FOR DELETE 
USING (true);