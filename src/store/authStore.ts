import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
    if (_isInitializing) return;
    _isInitializing = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await get().fetchUser();
      } else {
        set({ isLoading: false });
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            await get().fetchUser();
          }
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error en initialize:', err);
      set({ isLoading: false });
    } finally {
      _isInitializing = false;
    }
  },

  fetchUser: async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    let profile = null;
    let retries = 0;
    const maxRetries = 3;

    while (!profile && retries < maxRetries) {
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
    }

    const user: User = {
      id: authUser.id,
      email: authUser.email || '',
      name: profile?.name || authUser.user_metadata?.name || '',
      businessName: profile?.business_name || '',
      role: (profile?.role as 'admin' | 'user') || 'user',
      createdAt: authUser.created_at,
      subscription: {
        status: (profile?.subscription_status as any) || 'trialing',
        trialEndsAt: profile?.trial_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        validUntil: profile?.valid_until || null,
      },
    };

    set({ user, isAuthenticated: true, isLoading: false });
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
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false, isLoading: false });
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
