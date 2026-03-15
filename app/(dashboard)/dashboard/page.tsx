export default function DashboardPage() {
  return (
    <>
      <h1 className="changelog-page-title">Overview</h1>
      <p className="changelog-page-subtitle">Your workspace at a glance.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Reviews awaiting you
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            —
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Goals to check
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            —
          </p>
        </div>
      </div>
    </>
  )
}
