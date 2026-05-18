ALTER TABLE operator_vehicles
  ADD COLUMN IF NOT EXISTS name text;

UPDATE operator_vehicles
SET name = 'Van ' || sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY operator_id ORDER BY created_at) AS rn
  FROM operator_vehicles
) AS sub
WHERE operator_vehicles.id = sub.id
  AND (operator_vehicles.name IS NULL OR operator_vehicles.name = '');

ALTER TABLE operator_vehicles
  ALTER COLUMN name SET NOT NULL;
