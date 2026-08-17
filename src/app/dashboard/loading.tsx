export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#64748B] text-sm">Loading...</p>
      </div>
    </div>
  );
}
