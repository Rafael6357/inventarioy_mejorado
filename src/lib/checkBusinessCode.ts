import { supabase } from './supabase';

export async function ensureBusinessCodeColumn(): Promise<boolean> {
  try {
    // Intentar insertar un registro temporal para ver si la columna existe
    const { error } = await supabase
      .from('profiles')
      .select('business_code')
      .limit(1);

    if (error && error.message.includes('business_code')) {
      console.log('La columna business_code no existe, creando...');
      
      // La columna no existe - necesita ser creada por el usuario manualmente
      // ya queALTER TABLE requiere permisos de SQL
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Error verificando columna:', e);
    return false;
  }
}

export function getSQLForBusinessCode(): string {
  return `
-- Ejecutar esto en el SQL Editor de Supabase para agregar el campo de código de negocio

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_code TEXT;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_business_code 
ON public.profiles(business_code) 
WHERE business_code IS NOT NULL;
  `;
}