-- ============================================
-- SISTEMA DE NÓMINAS - CREACIÓN DE TABLAS
-- ============================================

-- 1. Tabla de Departamentos
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own departments" ON public.departments
  FOR ALL USING (auth.uid() = user_id);

-- 2. Tabla de Configuración de Nómina
CREATE TABLE IF NOT EXISTS public.payroll_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  tax_exemption_base NUMERIC(12, 2) DEFAULT 3260,
  tax_rate NUMERIC(5, 2) DEFAULT 3.00,
  special_contribution_rate NUMERIC(5, 2) DEFAULT 5.00,
  last_calculated_month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payroll_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own payroll config" ON public.payroll_config
  FOR ALL USING (auth.uid() = user_id);

-- 3. Tabla de Registros de Nómina
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  employee_name TEXT NOT NULL,
  employee_category TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  base_salary NUMERIC(12, 2) NOT NULL,
  earned_salary NUMERIC(12, 2) NOT NULL,
  exemption_base NUMERIC(12, 2) NOT NULL,
  taxable_base NUMERIC(12, 2) NOT NULL,
  tax_amount NUMERIC(12, 2) NOT NULL,
  special_contribution NUMERIC(12, 2) NOT NULL,
  net_salary NUMERIC(12, 2) NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own payroll entries" ON public.payroll_entries
  FOR ALL USING (auth.uid() = user_id);

-- 4. Agregar columnas a tabla employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS nit_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS category UUID REFERENCES public.departments(id);

-- ============================================
-- NOTAS PARA EL USUARIO:
-- 1. Ejecutar este script en el SQL Editor de Supabase
-- 2. Los campos "category" y "nit_id" en employees permiten asignar departamentos y NIT a cada empleado
-- 3. La configuración de nómina permite personalizar los % de retención
-- 4. Los registros de nómina se crean automáticamente al generar la nómina mensual
-- ============================================