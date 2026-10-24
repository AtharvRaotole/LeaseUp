import { Moon, Sun } from 'lucide-react';
import { useAppTheme } from '../../hooks/useAppTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppTheme();
  const nextLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border bg-surface-2/80 text-ink-2 transition-colors hover:border-border-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      data-testid="theme-toggle"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
