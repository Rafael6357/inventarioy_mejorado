-- Corrige teléfonos cubanos existentes sin el formato internacional correcto
-- Formato: +53 53004406
-- Ejecutar en el SQL Editor de Supabase

-- 1. Números de 8 dígitos (formato local cubano) → +53 + espacio + número
UPDATE profiles 
SET phone = '+53 ' || regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL 
  AND phone != ''
  AND LENGTH(regexp_replace(phone, '\D', '', 'g')) = 8;

-- 2. Números de 10 dígitos que empiezan con 53 pero sin + ni espacio
-- (quedaron de la ejecución anterior del script: "5353004406")
UPDATE profiles
SET phone = '+53 ' || substr(regexp_replace(phone, '\D', '', 'g'), 3)
WHERE phone IS NOT NULL
  AND phone != ''
  AND LENGTH(regexp_replace(phone, '\D', '', 'g')) = 10
  AND regexp_replace(phone, '\D', '', 'g') ~ '^53'
  AND phone !~ '^\+';

-- 3. Números de 10 dígitos que ya tienen + pero sin espacio
-- (quedaron de ejecuciones anteriores: "+5353004406")
UPDATE profiles
SET phone = '+53 ' || substr(regexp_replace(phone, '\D', '', 'g'), 3)
WHERE phone IS NOT NULL
  AND phone != ''
  AND LENGTH(regexp_replace(phone, '\D', '', 'g')) = 10
  AND regexp_replace(phone, '\D', '', 'g') ~ '^53'
  AND phone ~ '^\+53[0-9]';
