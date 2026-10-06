import { ChartNoAxesCombined, LayoutDashboard, LogOut, Trash2, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';

const navigationLinks = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', Icon: Users },
  { to: '/agents/trash', label: 'Trash', Icon: Trash2 },
  { to: '/analytics', label: 'Analytics', Icon: ChartNoAxesCombined },
];

export function AppHeader() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-[#091d33] text-slate-100 dark:border-slate-700">
      <div className="flex flex-col gap-4 px-1 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center">
          <h1 className="text-xl font-bold tracking-tight text-white">Agent Management</h1>
        </div>

        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
          {navigationLinks.map(({ to, label, Icon }) => (
            <NavLink
              className={({ isActive }) => `rounded-lg px-3 py-1.5 font-medium transition ${
                isActive
                || (to === '/agents' && pathname.startsWith('/agents/') && pathname !== '/agents/trash')
                  ? 'border border-blue-400/40 bg-blue-500/10 text-blue-300'
                  : 'text-slate-200 hover:bg-slate-700/60 hover:text-white'
              }`}
              end
              key={to}
              to={to}
            >
              <Icon aria-hidden="true" className="mr-1 inline-block size-4 align-[-3px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <span className="max-w-40 truncate rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-sm text-slate-300">
            {user?.name}
          </span>
          <ThemeToggle />
          <button
            className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            onClick={logout}
            type="button"
          >
            <LogOut aria-hidden="true" className="mr-1 inline-block size-4 align-[-3px]" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
