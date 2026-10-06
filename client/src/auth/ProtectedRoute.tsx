import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AppHeader } from '../components/AppHeader';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <p role="status" className="text-sm font-medium">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <>
      <div className="bg-slate-100 px-3 pt-4 dark:bg-slate-950 sm:px-8 sm:pt-6">
        <div className="mx-auto max-w-7xl">
          <AppHeader />
        </div>
      </div>
      <Outlet />
    </>
  );
}
