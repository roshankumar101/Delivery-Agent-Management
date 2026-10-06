import { MoonStar, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  const action = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      aria-label={action}
      className={`inline-flex items-center justify-center rounded-lg px-3 py-2 transition hover:text-slate-200 text-white ${className}`}
      onClick={toggleTheme}
      type="button"
    >
      {isDark
        ? <Sun aria-hidden="true" className="size-4" />
        : <MoonStar aria-hidden="true" className="size-4" />}
      
    </button>
  );
}
