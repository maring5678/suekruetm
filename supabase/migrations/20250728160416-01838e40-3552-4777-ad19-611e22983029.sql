-- Duplikate entfernen - nur das neueste von jedem Turnier-Namen behalten
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
  FROM tournaments
)
DELETE FROM tournaments 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);