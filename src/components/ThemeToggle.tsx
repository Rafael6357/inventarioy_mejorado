import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../design-system/ThemeProvider';

const modes = [
  { value: 'light' as const, icon: Sun, label: 'Claro' },
  { value: 'dark' as const, icon: Moon, label: 'Oscuro' },
  { value: 'system' as const, icon: Monitor, label: 'Sistema' },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const nextMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const { icon: NextIcon, label: nextLabel } = modes.find(m => m.value === nextMode)!;

  return (
    <button
      onClick={() => setTheme(nextMode)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
      title={`Cambiar a modo ${nextLabel.toLowerCase()}`}
      aria-label={`Tema actual: ${modes.find(m => m.value === theme)?.label}. Cambiar a ${nextLabel.toLowerCase()}`}
    >
      <NextIcon className="h-5 w-5" />
      Tema: {modes.find(m => m.value === theme)?.label}
    </button>
  );
}
