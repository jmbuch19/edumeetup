'use client'

import { useEffect } from 'react'

export default function StudentErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[Student Dashboard Error]', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-4">
            <div className="bg-orange-50 text-orange-500 rounded-full p-4 mb-4">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Something isn't right</h2>
            <p className="text-slate-500 max-w-md">We encountered an issue loading your dashboard.</p>
            <button
                onClick={reset}
                className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
                Refresh Page
            </button>
        </div>
    )
}
