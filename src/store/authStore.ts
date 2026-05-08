import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Store } from '@tauri-apps/plugin-store';
import { initialDataLoad } from '../lib/syncEngine';

let _authStore: Store | null = null;

async function getAuthStore(): Promise<Store> {
  if (!_authStore) {
    _authStore = await Store.load('auth_store.json');
  }
  return _authStore;
}

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
      console.log('🔐 initialize ya está en progreso, ignorando...');
      return;
    }
    _isInitializing = true;
    console.log('🔐 ========== INICIALIZANDO AUTH ==========');

    // Buscar tokens de sesión guardados (funciona offline)
    let savedSession: string | null = null;
    let savedCredentials: string | null = null;
    let savedEmail: string | null = null;
    
    console.log('🔐 Paso 1: Buscando tokens de sesión...');
    
    // Primero buscar tokens de sesión (permite restore sin red)
    try {
      const store = await getAuthStore();
      savedSession = await store.get<string>('saved_session');
      savedCredentials = await store.get<string>('saved_credentials');
      savedEmail = await store.get<string>('saved_email');
      console.log('🔐 - Tokens de sesión encontrados:', savedSession ? 'SÍ' : 'NO');
      console.log('🔐 - Credenciales encontradas:', savedCredentials ? 'SÍ' : 'NO');
    } catch (storeErr) {
      console.warn('🔐 Error leyendo Tauri Store, intentando localStorage:', storeErr);
      try {
        savedSession = localStorage.getItem('saved_session');
        savedCredentials = localStorage.getItem('saved_credentials');
        savedEmail = localStorage.getItem('saved_email');
      } catch (lsErr) {
        console.warn('🔐 Error leyendo localStorage:', lsErr);
      }
    }

    // INTENTO 1: Restaurar sesión con tokens guardados (funciona SIN internet si el token es válido)
    if (savedSession) {
      console.log('🔐 ========== INTENTO 1: Restaurar con tokens ==========');
      try {
        const sessionData = JSON.parse(atob(savedSession));
        console.log('🔐 - Token encontrado, intentando restaurar sesión...');
        
        // Intentar establecer la sesión con el token guardado (sin llamada a Supabase)
        // Esto funciona offline si el token no ha expirado
        const { data: sessionDataResult, error: sessionError } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        
        if (!sessionError && sessionDataResult?.user) {
          console.log('🔐 ========== SESIÓN RESTAURADA CON TOKEN (OFFLINE) ==========');
          console.log('🔐 Usuario:', sessionDataResult.user.email);
          await get().fetchUser();
          
          if (!_authListenerSubscription) {
            console.log('🔐 Creando listener de autenticación...');
            _authListenerSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
              console.log('🔐 Auth state change:', event);
              if (event === 'SIGNED_IN' && session?.user) {
                await get().fetchUser();
              } else if (event === 'SIGNED_OUT') {
                console.log('🔐 Sesión cerrada por Supabase (token expiró?)');
                set({ user: null, isAuthenticated: false, isLoading: false });
              }
            });
          }
          _isInitializing = false;
          return;
        } else {
          console.warn('🔐 Token inválido o expirado:', sessionError?.message);
          // El token expiró, continue al intento 2
        }
      } catch (tokenErr) {
        console.warn('🔐 Error restaurando con token:', tokenErr);
      }
    }

    // INTENTO 2: Login con credenciales (requiere internet)
    if (savedCredentials) {
      console.log('🔐 ========== INTENTO 2: Login con credenciales ==========');
      console.log('🔐 - Intentando login con credenciales guardadas...');
      try {
        const creds = JSON.parse(atob(savedCredentials));
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: creds.email,
          password: creds.password,
        });
        
        if (!signInError && data?.user) {
          console.log('🔐 ========== LOGIN CON CREDENCIALES EXITOSO ==========');
          console.log('🔐 Usuario:', data.user.email);
          
          // Guardar los nuevos tokens para futuras veces
          if (data.session) {
            const newSessionData = btoa(JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
              expires_in: data.session.expires_in,
            }));
            try {
              const store = await getAuthStore();
              await store.set('saved_session', newSessionData);
              await store.save();
              console.log('🔐 Nuevos tokens guardados');
            } catch (e) {
              localStorage.setItem('saved_session', newSessionData);
            }
          }
          
          await get().fetchUser();
          
          if (!_authListenerSubscription) {
            console.log('🔐 Creando listener de autenticación...');
            _authListenerSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
              console.log('🔐 Auth state change:', event);
              if (event === 'SIGNED_IN' && session?.user) {
                await get().fetchUser();
              } else if (event === 'SIGNED_OUT') {
                set({ user: null, isAuthenticated: false, isLoading: false });
              }
            });
          }
          _isInitializing = false;
          return;
        } else {
          console.warn('🔐 Credenciales inválidas:', signInError?.message);
          // Credenciales inválidas, limpiar
          try {
            const store = await getAuthStore();
            await store.delete('saved_credentials');
            await store.delete('saved_email');
            await store.delete('saved_session');
            await store.save();
          } catch (cleanErr) {
            localStorage.removeItem('saved_credentials');
            localStorage.removeItem('saved_email');
            localStorage.removeItem('saved_session');
          }
          set({ isLoading: false });
          _isInitializing = false;
          return;
        }
      } catch (autoLoginErr) {
        console.warn('🔐 Login automático falló:', autoLoginErr);
      }
    }

    // INTENTO 3: getSession de Supabase (último recurso, timeout más largo para conexiones lentas)
    console.log('🔐 ========== INTENTO 3: getSession de Supabase ==========');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout

      const { data: { session } } = await supabase.auth.getSession();
      clearTimeout(timeoutId);
      
      if (session?.user) {
        console.log('🔐 Sesión activa encontrada en Supabase');
        await get().fetchUser();
        
        if (!_authListenerSubscription) {
          console.log('🔐 Creando listener de autenticación...');
          _authListenerSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state change:', event);
            if (event === 'SIGNED_IN' && session?.user) {
              await get().fetchUser();
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, isAuthenticated: false, isLoading: false });
            }
          });
        }
        return;
      }
    } catch (abortErr: any) {
      if (abortErr.name === 'AbortError') {
        console.warn('🔐 Timeout en getSession (3s),sin sesión activa');
      } else {
        console.warn('🔐 Error en getSession:', abortErr.message);
      }
    }

    // No hay sesión ni credenciales válidas
    console.log('🔐 No hay sesión disponible, usuario debe hacer login');
    set({ isLoading: false });
    _isInitializing = false;
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
    } catch (err) {
      console.error('Error en fetchUser:', err);
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: translateError(error.message) };
    }

    if (data.user) {
      // Guardar credenciales para sesión persistente usando Tauri Store
      const credentials = btoa(JSON.stringify({ email, password }));
      
      // Guardar también los tokens de sesión para restauración offline
      let sessionData = null;
      if (data.session) {
        sessionData = btoa(JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
        }));
      }
      
      try {
        const store = await getAuthStore();
        await store.set('saved_credentials', credentials);
        await store.set('saved_email', email);
        if (sessionData) {
          await store.set('saved_session', sessionData);
        }
        await store.save();
        console.log('🔐 Tokens guardados en Tauri Store');
      } catch (storeErr) {
        console.warn('🔐 Error guardando en store, usando localStorage como fallback:', storeErr);
        localStorage.setItem('saved_credentials', credentials);
        localStorage.setItem('saved_email', email);
        if (sessionData) {
          localStorage.setItem('saved_session', sessionData);
        }
      }
      
      await get().fetchUser();
      
      const user = get().user;
      if (user) {
        setTimeout(() => {
          initialDataLoad(user.id).then(result => {
            if (result.success) {
              console.log('Datos iniciales cargados a SQLite');
            }
          });
        }, 1000);
      }
      
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
    console.log('🔐 Logout llamado, limpiando sesión...');
    try {
      // 1. Limpiar credenciales Y tokens guardados (Tauri Store + localStorage fallback)
      try {
        const store = await getAuthStore();
        await store.delete('saved_credentials');
        await store.delete('saved_email');
        await store.delete('saved_session');
        await store.save();
        console.log('🔐 Credenciales y tokens limpiados de Tauri Store');
      } catch (storeErr) {
        localStorage.removeItem('saved_credentials');
        localStorage.removeItem('saved_email');
        localStorage.removeItem('saved_session');
        console.log('🔐 Credenciales y tokens limpiados de localStorage');
      }
      
      // 2. Limpiar estado primero
      _isInitializing = false;
      _authListenerSubscription = null;
      set({ user: null, isAuthenticated: false, isLoading: false });
      console.log('Estado limpiado');
      
      // 3. Luego hacer signOut
      await supabase.auth.signOut();
      console.log('SignOut exitoso');
    } catch (err) {
      console.error('Error en logout:', err);
    } finally {
      // 4. Forzar redirección
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
