import { Skeleton } from "@/components/ui/skeleton"

export default function TicketDetailLoading() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Skeleton className="h-6 w-24 mb-4" /> {/* Back button */}

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-3/4" />
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="pt-4 border-t border-gray-100 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>

            {/* Messages Skeleton */}
            <div className="space-y-6">
                {[1, 2].map((i) => (
                    <div key={i} className={`flex gap-4 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className={`space-y-2 max-w-[80%] ${i % 2 === 0 ? 'items-end' : ''}`}>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
