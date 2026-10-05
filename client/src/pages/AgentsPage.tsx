import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgentForm } from '../components/AgentForm';
import { api } from '../api/client';
import type { ApiFailure, ApiSuccess } from '../types/api';
import type { AgentInput, DeliveryAgent, PaginatedAgents } from '../types/agent';

const statuses = ['ACTIVE', 'INACTIVE'] as const;

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data.message ?? 'The request could not be completed.';
  }
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

function statusClass(status: DeliveryAgent['status']): string {
  return status === 'ACTIVE'
    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AgentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedLimit = Number(searchParams.get('limit') ?? '10');
  const limit = [10, 25, 50].includes(requestedLimit) ? requestedLimit : 10;
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const serviceArea = searchParams.get('serviceArea') ?? '';

  const [searchDraft, setSearchDraft] = useState(search);
  const [serviceAreaDraft, setServiceAreaDraft] = useState(serviceArea);
  const [result, setResult] = useState<PaginatedAgents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modalAgent, setModalAgent] = useState<DeliveryAgent | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setSearchDraft(search);
    setServiceAreaDraft(serviceArea);
  }, [search, serviceArea]);

  const loadAgents = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ApiSuccess<PaginatedAgents>>('/agents', {
        params: {
          page,
          limit,
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(serviceArea ? { serviceArea } : {}),
        },
        signal,
      });
      setResult(data.data);
    } catch (loadError: unknown) {
      if (axios.isCancel(loadError)) return;
      setError(errorMessage(loadError));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [page, limit, search, status, serviceArea]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAgents(controller.signal);
    return () => controller.abort();
  }, [loadAgents]);

  function updateQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        const nextSearch = searchDraft.trim();
        const nextServiceArea = serviceAreaDraft.trim();
        const changed =
          (next.get('search') ?? '') !== nextSearch ||
          (next.get('serviceArea') ?? '') !== nextServiceArea;

        if (!changed) return current;
        if (nextSearch) next.set('search', nextSearch);
        else next.delete('search');
        if (nextServiceArea) next.set('serviceArea', nextServiceArea);
        else next.delete('serviceArea');
        next.delete('page');
        return next;
      });
    }, 350);

    return () => window.clearTimeout(timerId);
  }, [searchDraft, serviceAreaDraft, setSearchParams]);

  useEffect(() => {
    if (modalAgent === undefined) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSaving) setModalAgent(undefined);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAgent, isSaving]);

  async function saveAgent(input: AgentInput) {
    setIsSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      if (modalAgent) {
        await api.patch<ApiSuccess<DeliveryAgent>>(`/agents/${encodeURIComponent(modalAgent.id)}`, input);
        setNotice(`${input.fullName} was updated.`);
      } else {
        await api.post<ApiSuccess<DeliveryAgent>>('/agents', input);
        setNotice(`${input.fullName} was added.`);
      }
      setModalAgent(undefined);
      await loadAgents();
    } catch (saveError: unknown) {
      throw new Error(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAgent(agent: DeliveryAgent) {
    if (!window.confirm(`Move ${agent.fullName} to trash?`)) return;
    setDeletingId(agent.id);
    setActionError(null);
    setNotice(null);
    try {
      await api.delete<ApiSuccess<{ id: string }>>(`/agents/${encodeURIComponent(agent.id)}`);
      setNotice(`${agent.fullName} was moved to trash.`);
      await loadAgents();
    } catch (deleteError: unknown) {
      setActionError(errorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  async function exportCsv() {
    setIsExporting(true);
    setActionError(null);
    try {
      const { data } = await api.get<Blob>('/agents/export', {
        params: {
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(serviceArea ? { serviceArea } : {}),
        },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'delivery-agents.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError: unknown) {
      setActionError(errorMessage(exportError));
    } finally {
      setIsExporting(false);
    }
  }

  const agents = result?.agents ?? [];
  const totalPages = result?.totalPages ?? 0;
  const firstResult = result && result.total > 0 ? (result.page - 1) * result.limit + 1 : 0;
  const lastResult = result ? Math.min(result.page * result.limit, result.total) : 0;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-5">
          <div>
            <Link className="text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" to="/dashboard">← Dashboard</Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Delivery agents</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Search, filter, and manage your delivery team.</p>
          </div>
          <div className="flex w-full flex-col gap-2 min-[400px]:flex-row sm:w-auto">
            <button className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 min-[400px]:w-auto" disabled={isExporting} onClick={() => void exportCsv()} type="button">
              {isExporting ? 'Preparing…' : 'Export CSV'}
            </button>
            <button className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 min-[400px]:w-auto" onClick={() => setModalAgent(null)} type="button">
              Add agent
            </button>
          </div>
        </header>

        {actionError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">{actionError}</p>}
        {notice && <p aria-live="polite" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200" role="status">{notice}</p>}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <form
            className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              updateQuery({
                search: searchDraft.trim() || null,
                serviceArea: serviceAreaDraft.trim() || null,
                page: null,
              });
            }}
          >
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Search agents
              <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900" onChange={(event) => setSearchDraft(event.target.value)} placeholder="Name, phone, email, area" value={searchDraft} />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
              <select className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" onChange={(event) => updateQuery({ status: event.target.value || null, page: null })} value={status}>
                <option value="">All statuses</option>
                {statuses.map((item) => <option key={item} value={item}>{item === 'ACTIVE' ? 'Active' : 'Inactive'}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Service area
              <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900" onChange={(event) => setServiceAreaDraft(event.target.value)} placeholder="Any area" value={serviceAreaDraft} />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Per page
              <select className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" onChange={(event) => updateQuery({ limit: event.target.value, page: null })} value={limit}>
                {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            {(search || status || serviceArea) && (
              <button className="self-end rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => { setSearchDraft(''); setServiceAreaDraft(''); setSearchParams({}); }} type="button">Clear filters</button>
            )}
          </form>
          {(search || status || serviceArea) && (
            <div aria-label="Active filters" className="mt-4 flex flex-wrap gap-2">
              {search && (
                <button className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900" onClick={() => updateQuery({ search: null, page: null })} type="button">
                  Search: {search} <span aria-hidden="true">×</span>
                </button>
              )}
              {status && (
                <button className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900" onClick={() => updateQuery({ status: null, page: null })} type="button">
                  Status: {status === 'ACTIVE' ? 'Active' : 'Inactive'} <span aria-hidden="true">×</span>
                </button>
              )}
              {serviceArea && (
                <button className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900" onClick={() => updateQuery({ serviceArea: null, page: null })} type="button">
                  Service area: {serviceArea} <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          )}
        </section>

        {isLoading && <p aria-live="polite" role="status" className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{result ? 'Updating agent list…' : 'Loading agents…'}</p>}
        {!isLoading && error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-slate-900">
            <p role="alert" className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <button className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500" onClick={() => void loadAgents()} type="button">Retry</button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <p aria-live="polite" className="mt-5 text-sm text-slate-600 dark:text-slate-300">
              {result?.total ?? 0} {(result?.total ?? 0) === 1 ? 'agent' : 'agents'}
              {result && result.total > 0 && <> · Showing {firstResult}–{lastResult}</>}
            </p>
            <div className="mt-3 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Agent</th>
                    <th className="px-5 py-3 font-semibold">Contact</th>
                    <th className="px-5 py-3 font-semibold">Service area</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {agents.map((agent) => (
                    <tr key={agent.id}>
                      <td className="px-5 py-4">
                        <Link className="font-semibold text-blue-700 hover:underline" to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.fullName}</Link>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{agent.email}<br />{agent.phone}</td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{agent.serviceArea}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(agent.status)}`}>{agent.status}</span></td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(agent.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-3">
                          <button className="font-medium text-blue-700 hover:underline dark:text-blue-400" onClick={() => setModalAgent(agent)} type="button">Edit</button>
                          <button className="font-medium text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-400" disabled={deletingId !== null} onClick={() => void deleteAgent(agent)} type="button">{deletingId === agent.id ? 'Moving…' : 'Delete'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid gap-3 md:hidden">
              {agents.map((agent) => (
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" key={agent.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link className="font-semibold text-blue-700 hover:underline" to={`/agents/${encodeURIComponent(agent.id)}`}>{agent.fullName}</Link>
                      <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">{agent.email}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{agent.phone}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(agent.status)}`}>{agent.status}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{agent.serviceArea} · Added {formatDate(agent.createdAt)}</p>
                  <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button className="text-sm font-medium text-blue-700 dark:text-blue-400" onClick={() => setModalAgent(agent)} type="button">Edit</button>
                    <button className="text-sm font-medium text-rose-700 dark:text-rose-400" disabled={deletingId !== null} onClick={() => void deleteAgent(agent)} type="button">Delete</button>
                  </div>
                </article>
              ))}
            </div>
            {agents.length === 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">No agents found</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Adjust your filters or add a delivery agent.</p>
              </div>
            )}
            {totalPages > 0 && (
              <nav aria-label="Agent pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">Page {result?.page ?? page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" disabled={page <= 1} onClick={() => updateQuery({ page: String(page - 1) })} type="button">Previous</button>
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" disabled={page >= totalPages} onClick={() => updateQuery({ page: String(page + 1) })} type="button">Next</button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>

      {modalAgent !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setModalAgent(undefined); }}>
          <section aria-labelledby="agent-form-title" aria-modal="true" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100 sm:p-6" role="dialog">
            <div className="mb-5">
              <h2 className="text-xl font-bold" id="agent-form-title">{modalAgent ? 'Edit agent' : 'Add delivery agent'}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{modalAgent ? 'Update this agent’s information.' : 'Enter the delivery agent’s information.'}</p>
            </div>
            <AgentForm agent={modalAgent ?? undefined} isSaving={isSaving} onCancel={() => setModalAgent(undefined)} onSubmit={saveAgent} />
          </section>
        </div>
      )}
    </main>
  );
}
