import { Loader2 } from 'lucide-react'

export default function AdminLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            <p className="text-sm font-medium text-slate-500">Loading admin dashboard...</p>
        </div>
    )
}
