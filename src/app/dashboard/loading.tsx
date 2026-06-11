export default function DashboardLoading() {
  return (
    <div className="bg-slate-900 min-h-screen">
      <header className="border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            DuePulse
          </span>
          <div className="w-28 h-9 rounded-md bg-slate-800 animate-pulse" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl bg-slate-800 p-6 h-48 animate-pulse" />
            <div className="rounded-xl bg-slate-800 p-6 h-64 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl bg-slate-800 p-4 h-24 animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="hidden lg:block space-y-6">
            <div className="rounded-xl bg-slate-800 p-6 h-52 animate-pulse" />
            <div className="rounded-xl bg-slate-800 p-6 h-40 animate-pulse" />
            <div className="rounded-xl bg-slate-800 p-6 h-40 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
