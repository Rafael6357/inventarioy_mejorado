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

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await get().fetchUser();
    }
    set({ isLoading: false });

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await get().fetchUser();
      } else {
        set({ user: null, isAuthenticated: false });
      }
    });
  },

  fetchUser: async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

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

    set({ user, isAuthenticated: true });
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      await get().fetchUser();
      return { success: true };
    }

    return { success: false, error: 'Error desconocido' };
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
      return { success: false, error: error.message };
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        name,
        business_name: businessName,
        role: email === 'nikko6357@gmail.com' ? 'admin' : 'user',
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await get().fetchUser();
      return { success: true };
    }

    return { success: false, error: 'Error desconocido' };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
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
