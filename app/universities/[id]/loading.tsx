import { Skeleton } from "@/components/ui/skeleton"

export default function UniversityDetailLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header Skeleton */}
            <div className="h-48 md:h-64 rounded-xl bg-gray-200 mb-8 relative animate-pulse">
                <div className="absolute -bottom-10 left-8">
                    <Skeleton className="h-32 w-32 rounded-xl border-4 border-white" />
                </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row gap-8">
                {/* Left Column (Main Content) */}
                <div className="md:w-2/3 space-y-8">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <div className="flex gap-4">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-24 w-full" />
                    </div>

                    {/* Tabs / Programs Skeleton */}
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-48" />
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-6 w-48" />
                                        <Skeleton className="h-6 w-24" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="md:w-1/3 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                        <Skeleton className="h-10 w-full mt-4" />
                    </div>
                </div>
            </div>
        </div>
    )
}
