import { supabase } from './src/lib/supabase.js';

async function updateConstraint() {
  console.log('Actualizando constraint de sales...');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sale_type_check;
          ALTER TABLE sales ADD CONSTRAINT sales_sale_type_check
          CHECK (sale_type IN ('BAR', 'RESTAURANT', 'CAFETERIA', 'OTHER'));`
  });

  console.log('Resultado:', data, error);
}

updateConstraint().catch(console.error);
