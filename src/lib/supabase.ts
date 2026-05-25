import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase. Asegúrate de que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están definidas.');
}

const DEFAULT_TIMEOUT = 15000;

const customFetch: typeof fetch = async (url, options = {}) => {
  const urlString = typeof url === 'string' ? url : url.url;

  const isRefreshToken = urlString.includes('grant_type=refresh_token');
  const isRecover = urlString.includes('/auth/v1/recover');
  const isAuthRequest = isRefreshToken || isRecover;
  
  // Silenciar TODAS las requests cuando no hay internet
  // 503 evita que Supabase descarte la sesión (refresh_token se conserva)
  if (!navigator.onLine) {
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Si estamos offline (conexión se perdió entre medio o es flaky), responder silenciosamente
    if (!navigator.onLine) {
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isNetworkError = error.message === 'Failed to fetch' ||
                           error.message.includes('Failed to fetch') ||
                           error.message.includes('NetworkError') ||
                           error.message.includes('net::ERR_');

    // Requests de auth con error de red en conexión flaky
    if (isAuthRequest && isNetworkError) {
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error.name === 'AbortError') {
      throw new TypeError('Request timeout');
    }
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: customFetch,
  },
  db: {
    schema: 'public',
  }
});
