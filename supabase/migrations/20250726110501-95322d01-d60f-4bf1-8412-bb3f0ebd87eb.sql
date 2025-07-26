-- Alle importierten Turniere als abgeschlossen markieren
UPDATE tournaments 
SET completed_at = created_at 
WHERE completed_at IS NULL;