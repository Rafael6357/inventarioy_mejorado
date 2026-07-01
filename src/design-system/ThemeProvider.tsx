import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore(state => state.user);
  
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme-preference') as Theme | null;
    if (stored) setThemeState(stored);
    else if (user?.themePreference) setThemeState(user.themePreference);
    setMounted(true);
  }, [user?.themePreference]);

  useEffect(() => {
    if (!mounted) return;
    setResolvedTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme-preference', theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').update({ theme_preference: theme }).eq('id', user.id);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme-preference', newTheme);
    if (user) {
      supabase.from('profiles').update({ theme_preference: newTheme }).eq('id', user.id);
    }
  };

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}