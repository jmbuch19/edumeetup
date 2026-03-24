export default function AlumniDashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Stats Row Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 flex flex-col gap-2">
             <div className="h-4 w-24 bg-[#E8EAF6] rounded mb-2" />
             <div className="h-8 w-16 bg-[#E8EAF6] rounded" />
          </div>
        ))}
      </div>
      
      {/* Connect Requests List Skeleton */}
      <div className="mt-8">
        <div className="h-6 w-48 bg-[#E8EAF6] rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E8EAF6]" />
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-[#E8EAF6] rounded" />
                  <div className="h-3 w-28 bg-[#E8EAF6] rounded" />
                </div>
              </div>
              <div className="h-9 w-24 bg-[#E8EAF6] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
