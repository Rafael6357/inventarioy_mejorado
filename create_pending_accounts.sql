-- Tabla pending_accounts para clientes pendientes
CREATE TABLE IF NOT EXISTS pending_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE pending_accounts ENABLE ROW LEVEL SECURITY;

-- Política de acceso
CREATE POLICY "Users can manage their own pending accounts"
  ON pending_accounts FOR ALL
  USING (auth.uid() = user_id);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_pending_accounts_user_id ON pending_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_accounts_status ON pending_accounts(status);