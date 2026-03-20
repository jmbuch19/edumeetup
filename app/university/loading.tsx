import { Loader2 } from 'lucide-react'

export default function UniversityLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-sm font-medium text-slate-500">Loading university dashboard...</p>
        </div>
    )
}
