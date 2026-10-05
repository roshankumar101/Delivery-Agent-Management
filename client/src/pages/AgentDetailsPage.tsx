import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { AgentForm } from '../components/AgentForm';
import type { ApiFailure, ApiSuccess } from '../types/api';
import type { AgentInput, AgentModification, DeliveryAgent } from '../types/agent';

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data.message ?? 'Could not load this delivery agent.';
  }
  return 'Could not load this delivery agent.';
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString();
}

export function AgentDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [history, setHistory] = useState<AgentModification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSaving) setIsEditing(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, isSaving]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    Promise.all([
      api.get<ApiSuccess<DeliveryAgent>>(`/agents/${encodeURIComponent(id)}`, { signal: controller.signal }),
      api.get<ApiSuccess<AgentModification[]>>(`/agents/${encodeURIComponent(id)}/history`, { signal: controller.signal }),
    ])
      .then(([agentResponse, historyResponse]) => {
        setAgent(agentResponse.data.data);
        setHistory(historyResponse.data.data);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!axios.isCancel(loadError)) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  async function saveAgent(input: AgentInput) {
    if (!agent) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const { data } = await api.patch<ApiSuccess<DeliveryAgent>>(
        `/agents/${encodeURIComponent(agent.id)}`,
        input,
      );
      setAgent(data.data);
      const { data: historyResponse } = await api.get<ApiSuccess<AgentModification[]>>(
        `/agents/${encodeURIComponent(agent.id)}/history`,
      );
      setHistory(historyResponse.data);
      setIsEditing(false);
    } catch (saveError: unknown) {
      throw new Error(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function moveToTrash() {
    if (!agent || !window.confirm(`Move ${agent.fullName} to trash?`)) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await api.delete(`/agents/${encodeURIComponent(agent.id)}`);
      navigate('/agents');
    } catch (deleteError: unknown) {
      setActionError(errorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <Link className="text-sm font-medium text-blue-700 hover:text-blue-900" to="/agents">← Agents</Link>
          {!isLoading && !error && agent && (
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{agent.fullName}</h1>
                <p className="mt-1 text-sm text-slate-600">{agent.serviceArea}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setIsEditing(true)} type="button">Edit</button>
                <button className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" disabled={isDeleting} onClick={() => void moveToTrash()} type="button">{isDeleting ? 'Moving…' : 'Move to trash'}</button>
              </div>
            </div>
          )}
        </header>

        {isLoading && <p role="status" className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading agent details…</p>}
        {!isLoading && error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-white p-6">
            <p role="alert" className="text-sm text-red-800">{error}</p>
            <Link className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline" to="/agents">Return to agents</Link>
          </div>
        )}
        {actionError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>}

        {!isLoading && !error && agent && (
          <>
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Agent information</h2>
              <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {[
                  ['Email', agent.email],
                  ['Phone', agent.phone],
                  ['Service area', agent.serviceArea],
                  ['Status', agent.status],
                  ['Created', formatDateTime(agent.createdAt)],
                  ['Last updated', formatDateTime(agent.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Modification history</h2>
                  <p className="mt-1 text-sm text-slate-600">Sequential history of meaningful changes.</p>
                </div>
                <p className="text-sm text-slate-500">{history.length} {history.length === 1 ? 'entry' : 'entries'}</p>
              </div>
              {history.length === 0 ? (
                <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No modifications have been recorded.</p>
              ) : (
                <ol className="mt-5 space-y-4">
                  {history.map((entry) => (
                    <li className="rounded-xl border border-slate-200 p-4" key={entry.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-800">Modification M{entry.modificationNumber}</h3>
                        <time className="text-sm text-slate-500" dateTime={entry.modifiedAt}>{formatDateTime(entry.modifiedAt)}</time>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[420px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                              <th className="py-2 pr-3 font-medium">Field</th>
                              <th className="py-2 pr-3 font-medium">Previous</th>
                              <th className="py-2 font-medium">New</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.changedFields.map((field) => (
                              <tr className="border-b border-slate-50 last:border-0" key={field}>
                                <th className="py-2 pr-3 font-medium text-slate-700">{field}</th>
                                <td className="py-2 pr-3 text-slate-600">{String(entry.previousValues[field] ?? '—')}</td>
                                <td className="py-2 text-slate-800">{String(entry.newValues[field] ?? '—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
      {isEditing && agent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setIsEditing(false); }}>
          <section aria-labelledby="agent-edit-title" aria-modal="true" className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl" role="dialog">
            <div className="mb-5">
              <h2 className="text-xl font-bold" id="agent-edit-title">Edit agent</h2>
              <p className="mt-1 text-sm text-slate-600">Update this agent’s information.</p>
            </div>
            <AgentForm agent={agent} isSaving={isSaving} onCancel={() => setIsEditing(false)} onSubmit={saveAgent} />
          </section>
        </div>
      )}
    </main>
  );
}
