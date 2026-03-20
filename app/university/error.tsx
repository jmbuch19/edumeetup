'use client'

import { useEffect } from 'react'

export default function UniversityError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[University Error Boundary]')
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-red-50">
            <div className="max-w-2xl w-full bg-white rounded-2xl border border-red-200 shadow-xl p-8">
                <h1 className="text-2xl font-bold text-red-700 mb-2">Dashboard Error</h1>
                <p className="text-sm text-red-600 mb-4">
                    An error occurred loading the university dashboard. Details below:
                </p>
                <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6 overflow-auto max-h-64">
                    <p className="font-mono text-xs text-red-800 whitespace-pre-wrap break-all">
                        <strong>Message:</strong> {error.message || '(no message)'}
                    </p>
                    {error.digest && (
                        <p className="font-mono text-xs text-red-600 mt-2">
                            <strong>Digest:</strong> {error.digest}
                        </p>
                    )}
                    {error.stack && (
                        <p className="font-mono text-xs text-red-600 mt-2 whitespace-pre-wrap">
                            <strong>Stack:</strong>{'\n'}{error.stack}
                        </p>
                    )}
                </div>
                <button
                    onClick={reset}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold text-sm"
                >
                    Try Again
                </button>
                <p className="text-xs text-gray-400 mt-4">
                    Please screenshot this page and share it with the developer.
                </p>
            </div>
        </div>
    )
}
