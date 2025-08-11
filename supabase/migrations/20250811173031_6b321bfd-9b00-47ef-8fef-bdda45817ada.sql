-- Beende beide aktiven Turniere
UPDATE tournaments 
SET completed_at = now() 
WHERE completed_at IS NULL;

-- Lösche das Turnier mit weniger Runden (1 Runde) und alle zugehörigen Daten
-- Zuerst round_results löschen
DELETE FROM round_results 
WHERE round_id IN (
  SELECT r.id FROM rounds r 
  WHERE r.tournament_id = 'cafc0db6-b857-4cb4-9af2-12ba33488940'
);

-- Dann rounds löschen
DELETE FROM rounds 
WHERE tournament_id = 'cafc0db6-b857-4cb4-9af2-12ba33488940';

-- Dann tournament_players löschen
DELETE FROM tournament_players 
WHERE tournament_id = 'cafc0db6-b857-4cb4-9af2-12ba33488940';

-- Schließlich das Turnier selbst löschen
DELETE FROM tournaments 
WHERE id = 'cafc0db6-b857-4cb4-9af2-12ba33488940';