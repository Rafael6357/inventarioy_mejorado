-- Agrega columna para rastrear cuándo se contactó a un usuario por última vez
ALTER TABLE profiles ADD COLUMN last_contacted_at TIMESTAMPTZ;
