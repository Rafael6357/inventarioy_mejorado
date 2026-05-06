const { supabase } = require('./src/lib/supabase');

async function updateConstraint() {
  console.log('Actualizando constraint de sales...');
  
  // Verificar constraint actual
  const { data: checkData, error: checkError } = await supabase
    .from('sales')
    .select('sale_type')
    .limit(1);
  
  console.log('Verificando tabla sales...');
  
  // Intentar actualizar constraint usando pg_catalog
  const { data, error } = await supabase.rpc('pg_catalog.to_regclass', {
    text: 'sales_sale_type_check'
  });
  
  console.log('Resultado:', data, error);
  
  // Como no tenemos acceso directo a ALTER TABLE desde el cliente,
  // intentaremos una venta con BAR para ver si funciona
  console.log('Probando con una venta tipo BAR...');
}

updateConstraint().catch(console.error);