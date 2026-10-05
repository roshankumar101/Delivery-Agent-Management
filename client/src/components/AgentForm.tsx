import { useState, type FormEvent } from 'react';
import type { AgentInput, AgentStatus, DeliveryAgent } from '../types/agent';

interface AgentFormProps {
  agent?: DeliveryAgent;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: AgentInput) => Promise<void>;
}

const inputClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

export function AgentForm({ agent, isSaving, onCancel, onSubmit }: AgentFormProps) {
  const [fullName, setFullName] = useState(agent?.fullName ?? '');
  const [phone, setPhone] = useState(agent?.phone ?? '');
  const [email, setEmail] = useState(agent?.email ?? '');
  const [serviceArea, setServiceArea] = useState(agent?.serviceArea ?? '');
  const [status, setStatus] = useState<AgentStatus>(agent?.status ?? 'ACTIVE');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        serviceArea: serviceArea.trim(),
        status,
      });
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this agent.');
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Full name
        <input autoFocus className={inputClassName} maxLength={120} onChange={(event) => setFullName(event.target.value)} required value={fullName} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Phone
          <input className={inputClassName} autoComplete="tel" maxLength={24} onChange={(event) => setPhone(event.target.value)} required value={phone} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input className={inputClassName} autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Service area
          <input className={inputClassName} maxLength={120} onChange={(event) => setServiceArea(event.target.value)} required value={serviceArea} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Status
          <select className={inputClassName} onChange={(event) => setStatus(event.target.value as AgentStatus)} value={status}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60" disabled={isSaving} type="submit">
          {isSaving ? 'Saving…' : agent ? 'Save changes' : 'Add agent'}
        </button>
      </div>
    </form>
  );
}
