function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/70">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Phase 1
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Delivery Agent Management System
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Project scaffolding complete for the React client and Express server.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Frontend
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-800">React + TypeScript + Vite + Tailwind</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Backend
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-800">Express + TypeScript + Prisma + Redis</p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
