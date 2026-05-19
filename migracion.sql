-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard/project/ybymcbwnjcgdoqrosqdw/sql/new)

-- Productos y Movimientos (ya existentes)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_consumo_directo BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_gasto_variable BOOLEAN DEFAULT FALSE;

ALTER TABLE movements ADD COLUMN IF NOT EXISTS is_consumo_directo BOOLEAN DEFAULT FALSE;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS is_gasto_variable BOOLEAN DEFAULT FALSE;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS note TEXT;

-- Empleados - nuevos campos (ejecutar en una sola instrucción)
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE;
