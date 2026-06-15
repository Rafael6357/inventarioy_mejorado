export const tokens = {
  colors: {
    light: {
      bg: '#f8fafc',
      surface: '#ffffff',
      'surface-hover': '#f1f5f9',
      text: '#0f172a',
      'text-secondary': '#64748b',
      border: '#e2e8f0',
      primary: '#FF8F00',
      'primary-hover': '#FFC107',
      success: '#22c55e',
      danger: '#ef4444',
      warning: '#f59e0b',
    },
    dark: {
      bg: '#0a0a0a',
      surface: '#18181b',
      'surface-hover': '#1f1f1f',
      text: '#FFFFFF',
      'text-secondary': '#A1A1AA',
      border: '#27272a',
      primary: '#FFC107',
      'primary-hover': '#FFD54F',
      success: '#22c55e',
      danger: '#ef4444',
      warning: '#f59e0b',
    }
  },
  spacing: {
    1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
  },
  radii: {
    sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px',
  },
  shadows: {
    glow: '0 0 20px -5px rgba(255, 193, 7, 0.3)',
    'glow-hover': '0 0 30px -5px rgba(255, 193, 7, 0.4)',
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    modal: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  transitions: {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease',
  },
  breakpoints: {
    sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
  },
  typography: {
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    sizes: {
      xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
      xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
    },
    weights: {
      normal: '400', medium: '500', semibold: '600', bold: '700',
    },
  },
} as const;

export type ColorMode = 'light' | 'dark';
export type TokenColors = typeof tokens.colors.light;