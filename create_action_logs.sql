-- Tabla para registrar acciones de usuarios
CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  pin_role_label TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_action_logs_role ON action_logs(role);
CREATE INDEX IF NOT EXISTS idx_action_logs_module ON action_logs(module);

-- Habilitar RLS
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- Política: solo el owner del negocio puede ver sus logs
CREATE POLICY "Owner can view own action logs" ON action_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Función para eliminar logs con más de 2 meses de antigüedad
-- Esta función debe ejecutarse diariamente via Supabase Edge Function o cron job
CREATE OR REPLACE FUNCTION cleanup_old_action_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM action_logs
  WHERE created_at < NOW() - INTERVAL '2 months';
END $$;

-- Para ejecutar manualmente: SELECT cleanup_old_action_logs();
-- Para programar ejecución automática, usar Supabase Edge Functions o pg_cron