-- Agregar columna sale_type a pending_accounts
ALTER TABLE pending_accounts ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'SALON' CHECK (sale_type IN ('SALON', 'DOMICILIO'));