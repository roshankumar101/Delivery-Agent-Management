import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const action = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      aria-label={action}
      className="fixed bottom-4 right-4 z-40 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-950"
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
