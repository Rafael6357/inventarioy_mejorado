-- Tabla access_pins para pines de seguridad
CREATE TABLE IF NOT EXISTS access_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'economist', 'admin', 'supervisor', 'clerk')),
  is_active BOOLEAN DEFAULT true,
  failed_attempts INTEGER DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE access_pins ENABLE ROW LEVEL SECURITY;

-- Política de acceso
CREATE POLICY "Users can manage their own access pins"
  ON access_pins FOR ALL
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS access_pins_user_id ON access_pins(user_id);
CREATE INDEX IF NOT EXISTS access_pins_role ON access_pins(role);