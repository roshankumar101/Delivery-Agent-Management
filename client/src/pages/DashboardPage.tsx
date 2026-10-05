import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ApiFailure, ApiSuccess } from '../types/api';

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  deletedAgents: number;
  serviceAreaCount: number;
}

const statCards: Array<{ key: keyof DashboardStats; label: string; tone: string }> = [
  { key: 'totalAgents', label: 'Total agents', tone: 'text-slate-900' },
  { key: 'activeAgents', label: 'Active agents', tone: 'text-emerald-700' },
  { key: 'inactiveAgents', label: 'Inactive agents', tone: 'text-amber-700' },
  { key: 'deletedAgents', label: 'In trash', tone: 'text-rose-700' },
  { key: 'serviceAreaCount', label: 'Service areas', tone: 'text-blue-700' },
];

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data.message ?? 'Could not load dashboard statistics.';
  }
  return 'Could not load dashboard statistics.';
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    api.get<ApiSuccess<DashboardStats>>('/agents/stats')
      .then(({ data }) => {
        if (isCurrent) setStats(data.data);
      })
      .catch((error: unknown) => {
        if (isCurrent) setStatsError(getErrorMessage(error));
      })
      .finally(() => {
        if (isCurrent) setIsLoadingStats(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function exportCsv() {
    setExportError(null);
    setIsExporting(true);
    try {
      const { data } = await api.get<Blob>('/agents/export', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'delivery-agents.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setExportError(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Delivery operations</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <nav aria-label="Main navigation" className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-slate-100 pt-3 dark:border-slate-700 sm:w-auto sm:justify-start sm:border-0 sm:pt-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                className="py-1 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                to="/agents"
              >
                Agents
              </Link>
              <Link
                className="py-1 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                to="/agents/trash"
              >
                Trash
              </Link>
              <Link
                className="py-1 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                to="/analytics"
              >
                Analytics
              </Link>
            </div>
            <div className="flex items-center gap-3 sm:ml-2">
              <p className="max-w-32 truncate text-sm text-slate-600 dark:text-slate-300 sm:max-w-none">{user?.name}</p>
              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={logout}
                type="button"
              >
                Sign out
              </button>
            </div>
          </nav>
        </header>
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Operations overview</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Current delivery agent totals.</p>
            </div>
            <button
              className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              disabled={isExporting}
              onClick={() => void exportCsv()}
              type="button"
            >
              {isExporting ? 'Preparing CSV…' : 'Export CSV'}
            </button>
          </div>
          {exportError && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
              {exportError}
            </p>
          )}
          {isLoadingStats && (
            <p role="status" className="mt-4 text-sm text-slate-600 dark:text-slate-300">Loading statistics…</p>
          )}
          {!isLoadingStats && statsError && (
            <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
              {statsError}
            </p>
          )}
          {!isLoadingStats && !statsError && stats && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {statCards.map(({ key, label, tone }) => (
                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900" key={key}>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <p className={`mt-3 text-3xl font-bold tracking-tight ${tone}`}>
                    {stats[key].toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
