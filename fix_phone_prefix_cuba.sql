-- Corrige teléfonos cubanos existentes sin código de país (+53)
-- Solo modifica números de 8 dígitos (formato local cubano)
-- Ejecutar en el SQL Editor de Supabase

UPDATE profiles 
SET phone = '53' || regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL 
  AND phone != ''
  AND LENGTH(regexp_replace(phone, '\D', '', 'g')) = 8;
