import { useState, type FormEvent } from 'react';
import { serviceAreaOptions } from '../constants/serviceAreas';
import type { AgentInput, AgentStatus, DeliveryAgent } from '../types/agent';

interface AgentFormProps {
  agent?: DeliveryAgent;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: AgentInput) => Promise<void>;
}

const inputClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900';

const selectableServiceAreas = serviceAreaOptions.filter((area) => area !== 'All areas');

export function AgentForm({ agent, isSaving, onCancel, onSubmit }: AgentFormProps) {
  const [fullName, setFullName] = useState(agent?.fullName ?? '');
  const [phone, setPhone] = useState(agent?.phone ?? '');
  const [email, setEmail] = useState(agent?.email ?? '');
  const [serviceArea, setServiceArea] = useState(agent?.serviceArea ?? '');
  const availableServiceAreas = agent?.serviceArea
    && agent.serviceArea !== 'All areas'
    && !selectableServiceAreas.some((area) => area === agent.serviceArea)
    ? [agent.serviceArea, ...selectableServiceAreas]
    : selectableServiceAreas;
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
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Full name
        <input autoFocus className={inputClassName} maxLength={120} onChange={(event) => setFullName(event.target.value)} required value={fullName} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Phone
          <input className={inputClassName} autoComplete="tel" maxLength={24} onChange={(event) => setPhone(event.target.value)} required value={phone} />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Email
          <input className={inputClassName} autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Service area
          <select className={inputClassName} onChange={(event) => setServiceArea(event.target.value)} required value={serviceArea}>
            <option disabled value="">Select service area</option>
            {availableServiceAreas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Status
          <select className={inputClassName} onChange={(event) => setStatus(event.target.value as AgentStatus)} value={status}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500" disabled={isSaving} type="submit">
          {isSaving ? 'Saving…' : agent ? 'Save changes' : 'Add agent'}
        </button>
      </div>
    </form>
  );
}
