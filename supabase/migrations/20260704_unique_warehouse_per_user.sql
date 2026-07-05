-- ============================================================================
-- Migración: Un solo almacén "Almacén" por usuario (con is_main = true)
-- ============================================================================

-- Paso 1: Para cada usuario con duplicados, reasignar referencias al más antiguo
DO $$
DECLARE
  dup RECORD;
  survivor_id UUID;
BEGIN
  -- Iterar por cada warehouse que NO es el más antiguo de su user_id
  FOR dup IN
    WITH ranked AS (
      SELECT id, user_id,
        ROW_NUMBER() OVER (PARTITION BY user_id, is_main ORDER BY created_at ASC) AS rn
      FROM warehouses
      WHERE is_main = true
    )
    SELECT id, user_id FROM ranked WHERE rn > 1
  LOOP
    -- Encontrar el survivor (más antiguo) para este user_id
    SELECT id INTO survivor_id
    FROM warehouses
    WHERE user_id = dup.user_id AND is_main = true
    ORDER BY created_at ASC
    LIMIT 1;

    -- Reasignar product_warehouse
    UPDATE product_warehouse SET warehouse_id = survivor_id
    WHERE warehouse_id = dup.id;

    -- Reasignar movements
    UPDATE movements SET warehouse_id = survivor_id
    WHERE warehouse_id = dup.id;

    -- Eliminar el duplicado
    DELETE FROM warehouses WHERE id = dup.id;
  END LOOP;
END $$;

-- Paso 2: Crear índice único parcial (un solo is_main por usuario)
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_user_main
  ON warehouses (user_id) WHERE is_main = true;
