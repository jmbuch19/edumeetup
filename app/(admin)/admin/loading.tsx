export default function AdminLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-8 w-48 bg-[#E8EAF6] rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl bg-[#E8EAF6] h-24" />
        ))}
      </div>
      <div className="rounded-2xl bg-[#E8EAF6] h-64" />
    </div>
  )
}
