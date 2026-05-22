-- Corrige teléfonos existentes que no tienen código de país de Cuba (+53)
-- Ejecutar en el SQL Editor de Supabase

UPDATE profiles 
SET phone = '53' || regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL 
  AND phone != ''
  AND phone !~ '^\+?53';
