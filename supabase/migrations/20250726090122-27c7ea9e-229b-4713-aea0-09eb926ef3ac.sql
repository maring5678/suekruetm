-- Alle Turnierdaten zurücksetzen (Spielernamen bleiben erhalten)

-- Lösche alle Rundenergebnisse
DELETE FROM public.round_results;

-- Lösche alle Runden  
DELETE FROM public.rounds;

-- Lösche alle Turnier-Spieler-Verknüpfungen
DELETE FROM public.tournament_players;

-- Lösche alle Turniere
DELETE FROM public.tournaments;

-- Setze Sequenzen zurück falls vorhanden (für bessere Performance)
-- Da wir UUIDs verwenden, ist das nicht nötig, aber für Vollständigkeit