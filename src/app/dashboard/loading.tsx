export default function DashboardLoading() {
  return (
    <>
      {/* Topbar skeleton */}
      <div className="border-b border-[#2A3444] bg-[#0C111B] h-[57px] px-5 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-[#1C2637] animate-pulse hidden sm:block" />
        <div className="flex items-center gap-3 ml-auto">
          <div className="h-8 w-32 rounded-xl bg-[#151C2B] animate-pulse" />
          <div className="h-8 w-24 rounded-xl bg-[#151C2B] animate-pulse" />
        </div>
      </div>

      {/* Content skeleton */}
      <main className="flex-1 px-5 py-6 sm:px-6 sm:py-7 max-w-7xl w-full mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Heatmap skeleton */}
          <div className="xl:col-span-2 rounded-[18px] bg-[#151C2B] border border-[#2A3444] h-72 sm:h-80 animate-pulse" />

          {/* Stats skeleton */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] h-64 animate-pulse" />
            <div className="rounded-[18px] bg-[#151C2B] border border-[#2A3444] h-16 animate-pulse" />
          </div>
        </div>
      </main>
    </>
  );
}
