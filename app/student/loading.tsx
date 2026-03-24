export default function StudentDashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Hero skeleton */}
      <div className="bg-indigo-gradient rounded-2xl p-8 animate-pulse">
        <div className="h-6 w-48 bg-white/20 rounded mb-3" />
        <div className="h-10 w-72 bg-white/20 rounded mb-2" />
        <div className="h-4 w-40 bg-white/10 rounded" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
            <div className="flex gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#E8EAF6]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-[#E8EAF6] rounded" />
                <div className="h-3 w-1/2 bg-[#E8EAF6] rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-[#E8EAF6] rounded mb-2" />
            <div className="h-3 w-2/3 bg-[#E8EAF6] rounded mb-4" />
            <div className="h-9 w-full bg-[#E8EAF6] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
