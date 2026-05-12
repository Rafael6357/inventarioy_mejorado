import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase. Asegúrate de que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están definidas.');
}

const DEFAULT_TIMEOUT = 15000;

function isOnline(): boolean {
  return navigator.onLine;
}

const customFetch: typeof fetch = async (url, options = {}) => {
  const urlString = typeof url === 'string' ? url : url.url;
  
  const isRefreshToken = urlString.includes('grant_type=refresh_token');
  const isPasswordGrant = urlString.includes('grant_type=password');
  const isRecover = urlString.includes('/auth/v1/recover');
  
  // Verificar si es request de auth que debemos manejar silenciosamente
  const isAuthRequest = isRefreshToken || isRecover;

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
    
    // Detectar errores de red (no solo de timeout)
    const isNetworkError = error.message === 'Failed to fetch' || 
                           error.message.includes('Failed to fetch') ||
                           error.message.includes('NetworkError') ||
                           error.message.includes('net::ERR_');
    
    // Si es request de auth y hay error de red, manejar silenciosamente
    if (isAuthRequest && isNetworkError) {
      console.log('[supabase] Network error on auth request, suppressing for offline mode');
      throw new TypeError('Failed to fetch (offline)');
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
