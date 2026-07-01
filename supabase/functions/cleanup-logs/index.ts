import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const CRON_SECRET = Deno.env.get('CRON_SECRET');

Deno.serve(async (req) => {
  try {
    // Require authentication via shared secret header
    // Set CRON_SECRET in Supabase dashboard > Edge Functions > cleanup-logs > Environment Variables
    if (!CRON_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server misconfiguration: CRON_SECRET not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar logs con más de 2 meses de antigüedad
    const { data, error } = await supabase.rpc('cleanup_old_action_logs');

    if (error) {
      console.error('Error cleaning up logs:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Internal error cleaning logs' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Logs con más de 2 meses eliminados',
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in cleanup-logs:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});