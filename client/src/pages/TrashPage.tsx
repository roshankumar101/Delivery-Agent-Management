import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ApiFailure, ApiSuccess } from '../types/api';

interface DeletedAgent {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  serviceArea: string;
  status: 'ACTIVE' | 'INACTIVE';
  deletedAt: string;
}

const retentionPeriodMs = 3 * 24 * 60 * 60 * 1000;

function formatRemainingTime(deletedAt: string, now: number): string {
  const remainingMs = Math.max(0, new Date(deletedAt).getTime() + retentionPeriodMs - now);
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(remainingHours / 24);
  const hours = remainingHours % 24;

  if (days === 0 && hours === 0) return '0 hours';
  if (days === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  if (hours === 0) return `${days} ${days === 1 ? 'day' : 'days'}`;
  return `${days} ${days === 1 ? 'day' : 'days'}, ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data.message ?? fallback;
  }
  return fallback;
}

export function TrashPage() {
  const [agents, setAgents] = useState<DeletedAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadTrash = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ApiSuccess<DeletedAgent[]>>('/agents/trash');
      setAgents(data.data);
    } catch (loadError: unknown) {
      setError(getApiErrorMessage(loadError, 'Could not load deleted agents.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function handleRestore(agent: DeletedAgent) {
    setRestoringId(agent.id);
    setActionError(null);
    try {
      await api.post<ApiSuccess<DeletedAgent>>(`/agents/${encodeURIComponent(agent.id)}/restore`);
      setAgents((currentAgents) => currentAgents.filter(({ id }) => id !== agent.id));
    } catch (restoreError: unknown) {
      setActionError(getApiErrorMessage(restoreError, `Could not restore ${agent.fullName}.`));
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-5">
          <div>
            <Link className="text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" to="/dashboard">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Trash</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Deleted agents are retained for three days and can be restored.
            </p>
          </div>
          <button
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
            onClick={() => void loadTrash()}
            type="button"
          >
            Refresh
          </button>
        </header>

        {actionError && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
            {actionError}
          </p>
        )}

        <section className="mt-6 space-y-3" aria-live="polite">
          {isLoading && (
            <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Loading deleted agents…
            </p>
          )}

          {!isLoading && error && (
            <div className="rounded-xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-slate-900">
              <p role="alert" className="text-sm text-red-800 dark:text-red-200">{error}</p>
              <button
                className="mt-4 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                onClick={() => void loadTrash()}
                type="button"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && agents.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Trash is empty.
            </p>
          )}

          {!isLoading && !error && agents.map((agent) => (
            <article
              className="flex min-w-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              key={agent.id}
            >
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{agent.fullName}</h2>
                <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
                  {agent.email} · {agent.phone} · {agent.serviceArea}
                </p>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div className="flex gap-1">
                    <dt className="text-slate-500 dark:text-slate-400">Deleted:</dt>
                    <dd className="text-slate-700 dark:text-slate-200">
                      {new Date(agent.deletedAt).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="text-slate-500 dark:text-slate-400">Time remaining:</dt>
                    <dd className="font-medium text-amber-700">
                      {formatRemainingTime(agent.deletedAt, now)}
                    </dd>
                  </div>
                </dl>
              </div>
              <button
                className="w-full shrink-0 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 sm:w-auto"
                disabled={restoringId !== null}
                onClick={() => void handleRestore(agent)}
                type="button"
              >
                {restoringId === agent.id ? 'Restoring…' : 'Restore'}
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
