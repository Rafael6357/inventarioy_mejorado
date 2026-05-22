-- Corrige teléfonos cubanos existentes sin el formato internacional correcto
-- Ejecutar en el SQL Editor de Supabase

-- 1. Números de 8 dígitos (formato local cubano) → +53 + número
UPDATE profiles 
SET phone = '+53' || regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL 
  AND phone != ''
  AND LENGTH(regexp_replace(phone, '\D', '', 'g')) = 8;

-- 2. Números de 10 dígitos que empiezan con 53 pero sin el +
-- (quedaron de la ejecución anterior del script)
UPDATE profiles
SET phone = '+' || regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL
  AND phone != ''
  AND LENGTH(regexp_replace(phone, '\D', '', 'g')) = 10
  AND regexp_replace(phone, '\D', '', 'g') ~ '^53';
