-- Agregar columna is_account_house a pending_accounts
ALTER TABLE pending_accounts ADD COLUMN IF NOT EXISTS is_account_house BOOLEAN DEFAULT false;

-- Actualizar registros existentes donde el total sea 0 para marcarlos como cuenta casa
UPDATE pending_accounts 
SET is_account_house = true 
WHERE total_amount = 0 AND status = 'pending';