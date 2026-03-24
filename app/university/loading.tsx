export default function UniversityDashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="bg-indigo-gradient rounded-2xl p-8">
        <div className="h-8 w-64 bg-white/20 rounded mb-2" />
        <div className="h-4 w-48 bg-white/10 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card rounded-2xl p-5">
            <div className="h-8 w-16 bg-[#E8EAF6] rounded mb-2 mx-auto" />
            <div className="h-3 w-full bg-[#E8EAF6] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
