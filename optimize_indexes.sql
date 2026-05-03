-- ============================================
-- ÍNDICES OPTIMIZADOS PARA INVENTARIOY SaaS
-- Optimización profesional de consultas
-- ============================================

-- 1. Payroll Entries: consultas por usuario + mes/año (historial)
CREATE INDEX IF NOT EXISTS idx_payroll_entries_user_month_year
  ON payroll_entries (user_id, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee
  ON payroll_entries (employee_id);

-- 2. Employees: búsquedas por nombre + filtros por departamento
CREATE INDEX IF NOT EXISTS idx_employees_user_category
  ON employees (user_id, category);

CREATE INDEX IF NOT EXISTS idx_employees_user_name
  ON employees (user_id, LOWER(name) text_pattern_ops);

-- 3. Action Logs: historial de actividad del usuario
CREATE INDEX IF NOT EXISTS idx_action_logs_user_created
  ON action_logs (user_id, created_at DESC);

-- 4. Sales: filtros frecuentes por fecha y usuario
CREATE INDEX IF NOT EXISTS idx_sales_user_date
  ON sales (user_id, created_at DESC);

-- 5. Products: búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_products_user_name
  ON products (user_id, LOWER(name) text_pattern_ops);

-- 6. Movements: historial de inventario por fecha
CREATE INDEX IF NOT EXISTS idx_movements_user_created
  ON movements (user_id, created_at DESC);

-- 7. Pending Accounts: cuentas pendientes por fecha
CREATE INDEX IF NOT EXISTS idx_pending_accounts_user_created
  ON pending_accounts (user_id, created_at DESC);

-- ============================================
-- NOTAS:
-- 1. Ejecutar en SQL Editor de Supabase
-- 2. Estos índices mejoran dramáticamente el rendimiento con datos históricos
-- 3. text_pattern_ops permite búsquedas ILIKE eficientes
-- ============================================