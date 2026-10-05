import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Delivery operations</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-600">{user?.name}</p>
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={logout}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">You’re signed in</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your administrator session is active. Dashboard features will be added in their scheduled phases.
          </p>
        </section>
      </div>
    </main>
  );
}
