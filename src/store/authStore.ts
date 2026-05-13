import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const checkRealInternetConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Usar el propio endpoint de Supabase - si responde, hay internet real
    const { error } = await supabase.from('products').select('id').limit(1).maybeSingle();
    
    clearTimeout(timeoutId);
    return !error;
  } catch {
    return false;
  }
};

export interface User {
  id: string;
  email: string;
  name: string;
  businessName: string;
  role: 'admin' | 'user';
  createdAt: string;
  subscription: {
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    trialEndsAt: string;
    validUntil: string | null;
  };
  isSubscriptionActive: boolean;
  generateTicket: boolean;
  ticketMessage: string;
  usdEnabled: boolean;
  usdRate: number;
  eurEnabled: boolean;
  eurRate: number;
  cupTransferEnabled: boolean;
  phone: string;
  address: string;
  businessHours: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, businessName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateSubscription: (updates: Partial<User['subscription']>) => void;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

let _isInitializing = false;
let _authListenerSubscription: any = null;

const checkSubscriptionActive = (email: string, subscription: User['subscription']): boolean => {
  if (email === 'nikko6357@gmail.com') {
    return true;
  }
  
  if (subscription.status === 'canceled') {
    return false;
  }
  
  if (subscription.status === 'past_due') {
    return false;
  }
  
  if (subscription.status === 'active') {
    if (subscription.validUntil) {
      const validUntil = new Date(subscription.validUntil);
      if (validUntil > new Date()) {
        return true;
      }
    }
    return false;
  }
  
  if (subscription.status === 'trialing') {
    const trialEnd = new Date(subscription.trialEndsAt);
    if (trialEnd > new Date()) {
      return true;
    }
    return false;
  }
  
  return false;
};

const translateError = (message: string): string => {
  const errorTranslations: Record<string, string> = {
    'Invalid login credentials': 'Credenciales de inicio de sesión inválidas',
    'Email not confirmed': 'Correo electrónico no confirmado',
    'User already registered': 'Este correo electrónico ya está registrado',
    'User already exists': 'Este usuario ya existe',
    'Invalid email': 'Correo electrónico inválido',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Signup requires a valid password': 'Para registrarse se requiere una contraseña válida',
    'Unable to validate email address: Invalid email format': 'No se pudo validar el correo electrónico: Formato inválido',
    'No valid workers found': 'No se encontraron trabajadores válidos',
    'Not authorized': 'No autorizado',
    'Session expired': 'Sesión expirada',
    'Token expired': 'Token expirado',
    'Invalid token': 'Token inválido',
    'Failed to parse signlink URL': 'Error al analizar la URL de enlace',
    'Linking requires a confirmation': 'La vinculación requiere una confirmación',
    'A user with this email address has already been registered': 'Ya existe un usuario con este correo electrónico',
    'To sign up, you must accept the Terms': 'Para registrarte, debes aceptar los Términos',
    'Security key issue': 'Problema con la clave de seguridad',
    'Phone number is invalid': 'El número de teléfono es inválido',
    'Invalid phone number': 'Número de teléfono inválido',
    'Too many requests': 'Demasiadas solicitudes. Por favor, espera un momento',
    'Network request failed': 'Error de solicitud de red',
    'Invalid URL': 'URL inválida',
    'Missing requirements for Sozial Login': 'Requisitos faltantes para inicio de sesión social',
    'Failed to fetch': 'Sin conexión a internet',
    'Failed to fetch (offline)': 'Sin conexión a internet',
    'NetworkError': 'Sin conexión a internet',
  };

  if (errorTranslations[message]) {
    return errorTranslations[message];
  }

  if (message.includes('Invalid login credentials')) {
    return 'Credenciales de inicio de sesión inválidas';
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'Este correo electrónico ya está registrado';
  }
  if (message.includes('invalid email') || message.includes('Invalid email')) {
    return 'Correo electrónico inválido';
  }
  if (message.includes('password')) {
    return 'Contraseña incorrecta';
  }
  if (message.includes('not confirmed')) {
    return 'Correo electrónico no confirmado. Revisa tu bandeja de entrada';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Demasiadas solicitudes. Por favor, espera un momento';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Error de conexión. Verifica tu internet';
  }

  return message;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    if (_isInitializing) {
      console.log('initialize ya está en progreso, ignorando...');
      return;
    }
    _isInitializing = true;
    console.log('Inicializando autenticación...');

    // Solo modo online - sin SQLite
    const savedUserData = localStorage.getItem('inventarioy_user');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        
        if (session?.user) {
          await get().fetchUser();
        } else {
          // Intentar login automático con credenciales guardadas solo si hay internet
          if (navigator.onLine) {
            const savedCredentials = localStorage.getItem('saved_credentials');
            if (savedCredentials) {
              try {
                const creds = JSON.parse(atob(savedCredentials));
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email: creds.email,
                  password: creds.password,
                });
                if (!signInError) {
                  await get().fetchUser();
                } else {
                  localStorage.removeItem('saved_credentials');
                  localStorage.removeItem('saved_email');
                  set({ isLoading: false });
                }
              } catch (autoLoginErr) {
                console.warn('Login automático falló:', autoLoginErr);
                set({ isLoading: false });
              }
            } else {
              set({ isLoading: false });
            }
          } else {
            // Offline y no hay sesión guardada
            set({ isLoading: false });
          }
        }
      } catch (abortErr: any) {
        clearTimeout(timeoutId);
        if (abortErr.name === 'AbortError') {
          console.warn('Timeout en getSession');
          // Si hay sesión offline guardada, usarla
          if (savedUserData) {
            try {
              const userData = JSON.parse(savedUserData);
              set({ user: userData, isAuthenticated: true, isLoading: false });
            } catch {
              set({ isLoading: false });
            }
          } else {
            set({ isLoading: false });
          }
          _isInitializing = false;
          return;
        }
        throw abortErr;
      }

      if (!_authListenerSubscription) {
        console.log('Creando listener de autenticación...');
        _authListenerSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event);
          if (event === 'SIGNED_IN' && session?.user) {
            await get().fetchUser();
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        });
      }
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.status === 429) {
        console.warn('Rate limit alcanzado en autenticación, reintentando en 5 segundos...');
        await new Promise(r => setTimeout(r, 5000));
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await get().fetchUser();
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      } else if (import.meta.env.DEV) {
        console.error('Error en initialize:', err);
        set({ isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } finally {
      _isInitializing = false;
    }
  },

  fetchUser: async () => {
    console.log('fetchUser llamado...');
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Error en getUser:', authError);
        return;
      }
      
      if (!authUser) {
        console.log('No hay usuario autenticado');
        return;
      }

      let profile = null;
      let retries = 0;
      const maxRetries = 3;

      while (!profile && retries < maxRetries) {
        try {
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (result.error && (result.error as any).status === 406) {
            retries++;
            await new Promise(r => setTimeout(r, 300 * retries));
            continue;
          }

          profile = result.data;
          break;
        } catch (dbErr: any) {
          console.error('Error de base de datos en fetchUser:', dbErr);
          retries++;
          if (retries >= maxRetries) throw dbErr;
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (!profile) {
        console.warn('No se pudo obtener el perfil después de retries');
        set({ isLoading: false });
        return;
      }

      const subscription = {
        status: (profile?.subscription_status as any) || 'trialing',
        trialEndsAt: profile?.trial_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        validUntil: profile?.valid_until ? profile.valid_until.split('T')[0] : null,
      };

      const user: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: profile?.name || authUser.user_metadata?.name || '',
        businessName: profile?.business_name || '',
        role: (profile?.role as 'admin' | 'user') || 'user',
        createdAt: authUser.created_at,
        subscription,
        isSubscriptionActive: checkSubscriptionActive(authUser.email || '', subscription),
        generateTicket: profile?.generate_ticket ?? false,
        ticketMessage: profile?.ticket_message || '¡Gracias por su visita!',
        usdEnabled: profile?.usd_enabled ?? false,
        usdRate: profile?.usd_rate ?? 320,
        eurEnabled: profile?.eur_enabled ?? false,
        eurRate: profile?.eur_rate ?? 350,
        cupTransferEnabled: profile?.cup_transfer_enabled ?? false,
        phone: profile?.phone || '',
        address: profile?.address || '',
        businessHours: profile?.business_hours || '',
      };

      console.log('Usuario cargado:', user.email, 'role:', user.role, 'subscriptionActive:', user.isSubscriptionActive);
      set({ user, isAuthenticated: true, isLoading: false });
      
      // Código SQLite eliminado
      // const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
      // if (isTauri) { try { await saveUserSession(user); } catch (e) {} }
    } catch (err) {
      console.error('Error en fetchUser:', err);
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    const isOnline = navigator.onLine && await checkRealInternetConnection();
    if (!isOnline) {
      return { success: false, error: 'Sin conexión a internet. Inicia sesión cuando tengas internet.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: translateError(error.message) };
    }

    if (data.user) {
      // Guardar credenciales para sesión persistente
      const credentials = btoa(JSON.stringify({ email, password }));
      localStorage.setItem('saved_credentials', credentials);
      localStorage.setItem('saved_email', email);
      
      await get().fetchUser();
      return { success: true };
    }

    return { success: false, error: 'Error desconocido al iniciar sesión' };
  },

  register: async (email: string, password: string, name: string, businessName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          business_name: businessName,
        },
      },
    });

    if (error) {
      return { success: false, error: translateError(error.message) };
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        name,
        business_name: businessName,
        role: 'user',
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (profileError) {
        if (import.meta.env.DEV) console.error('Error al crear perfil:', profileError);
      }

      return { success: true };
    }

    return { success: false, error: 'Error desconocido al registrar' };
  },

  logout: async () => {
    console.log('Logout llamado...');
    try {
      // Código SQLite eliminado
      
      localStorage.removeItem('saved_credentials');
      localStorage.removeItem('saved_email');
      
      _isInitializing = false;
      _authListenerSubscription = null;
      set({ user: null, isAuthenticated: false, isLoading: false });
      console.log('Estado limpiado');
      
      await supabase.auth.signOut();
      console.log('SignOut exitoso');
    } catch (err) {
      console.error('Error en logout:', err);
    } finally {
      // Forzar redirección
      console.log('Redireccionando...');
      window.location.href = '/';
    }
  },

  updateSubscription: async (updates) => {
    const { user } = get();
    if (!user) return;

    const newSubscription = { ...user.subscription, ...updates };
    
    await supabase
      .from('profiles')
      .update({ 
        subscription_status: newSubscription.status,
        valid_until: newSubscription.validUntil,
      })
      .eq('id', user.id);

    set({
      user: { ...user, subscription: newSubscription },
    });
  },
}));
