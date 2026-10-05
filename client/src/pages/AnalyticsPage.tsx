import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ApiFailure, ApiSuccess } from '../types/api';

interface AnalyticsData {
  agentsByServiceArea: Array<{ serviceArea: string; count: number }>;
  statusDistribution: Array<{ status: 'ACTIVE' | 'INACTIVE'; count: number }>;
  creationTrend: Array<{ month: string; count: number }>;
  modificationActivity: Array<{ month: string; count: number }>;
  lifecycleTrend: Array<{
    month: string;
    deleted: number;
    restored: number;
    permanentlyDeleted: number;
  }>;
  lifecycleTotals: {
    deleted: number;
    restored: number;
    permanentlyDeleted: number;
  };
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data.message ?? 'Could not load analytics.';
  }
  return 'Could not load analytics.';
}

function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

function BarList<T,>({
  rows,
  getLabel,
  getValue,
  emptyMessage,
}: {
  rows: T[];
  getLabel: (row: T) => string;
  getValue: (row: T) => number;
  emptyMessage: string;
}) {
  const maximum = Math.max(1, ...rows.map(getValue));
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const value = getValue(row);
        const label = getLabel(row);
        return (
          <li key={label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{label}</span>
              <span className="font-semibold tabular-nums text-slate-900">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.max(value > 0 ? 3 : 0, (value / maximum) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    api.get<ApiSuccess<AnalyticsData>>('/agents/analytics')
      .then(({ data }) => {
        if (isCurrent) setAnalytics(data.data);
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <Link className="text-sm font-medium text-blue-700 hover:text-blue-900" to="/dashboard">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Agent analytics</h1>
          <p className="mt-1 text-sm text-slate-600">
            Database-backed service area, status, creation, modification, and lifecycle trends.
          </p>
        </header>

        {isLoading && (
          <p role="status" className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading analytics…
          </p>
        )}
        {!isLoading && error && (
          <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-white p-6 text-sm text-red-800">
            {error}
          </p>
        )}

        {!isLoading && !error && analytics && (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Moved to trash', value: analytics.lifecycleTotals.deleted, tone: 'text-amber-700' },
                { label: 'Restored', value: analytics.lifecycleTotals.restored, tone: 'text-emerald-700' },
                { label: 'Permanently deleted', value: analytics.lifecycleTotals.permanentlyDeleted, tone: 'text-rose-700' },
              ].map(({ label, value, tone }) => (
                <article className="rounded-xl border border-slate-200 bg-white p-5" key={label}>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className={`mt-2 text-3xl font-bold ${tone}`}>{value.toLocaleString()}</p>
                </article>
              ))}
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-5 font-semibold">Agents by service area</h2>
                <BarList
                  rows={analytics.agentsByServiceArea}
                  getLabel={(row) => row.serviceArea}
                  getValue={(row) => row.count}
                  emptyMessage="No service area data yet."
                />
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-5 font-semibold">Active vs inactive</h2>
                <BarList
                  rows={analytics.statusDistribution}
                  getLabel={(row) => row.status}
                  getValue={(row) => row.count}
                  emptyMessage="No status data yet."
                />
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-5 font-semibold">Agent creation trend · 12 months</h2>
                <BarList
                  rows={analytics.creationTrend}
                  getLabel={(row) => formatMonth(row.month)}
                  getValue={(row) => row.count}
                  emptyMessage="No creation history yet."
                />
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-5 font-semibold">Modification activity · 12 months</h2>
                <BarList
                  rows={analytics.modificationActivity}
                  getLabel={(row) => formatMonth(row.month)}
                  getValue={(row) => row.count}
                  emptyMessage="No modification history yet."
                />
              </article>
            </section>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-5 font-semibold">Deleted, restored, and permanent deletion activity · 12 months</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 font-medium">Moved to trash</th>
                      <th className="px-3 py-2 font-medium">Restored</th>
                      <th className="px-3 py-2 font-medium">Permanently deleted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.lifecycleTrend.map((row) => (
                      <tr className="border-b border-slate-100 last:border-0" key={row.month}>
                        <td className="px-3 py-2.5 text-slate-700">{formatMonth(row.month)}</td>
                        <td className="px-3 py-2.5 tabular-nums">{row.deleted}</td>
                        <td className="px-3 py-2.5 tabular-nums">{row.restored}</td>
                        <td className="px-3 py-2.5 tabular-nums">{row.permanentlyDeleted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
