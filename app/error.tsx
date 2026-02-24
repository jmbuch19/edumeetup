'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    const isDev = process.env.NODE_ENV === 'development'

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
            <p className="text-gray-600 mb-4 max-w-md">
                We apologize for the inconvenience. Our team has been notified of this issue.
            </p>

            {/* Show error details in dev mode only */}
            {isDev && (
                <div className="mb-6 max-w-2xl w-full text-left bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs font-mono font-bold text-red-700 mb-1">DEV ERROR:</p>
                    <p className="text-sm font-mono text-red-800 break-all">{error.message}</p>
                    {error.digest && <p className="text-xs font-mono text-red-500 mt-1">Digest: {error.digest}</p>}
                    {error.stack && (
                        <pre className="text-xs font-mono text-red-600 mt-2 whitespace-pre-wrap overflow-auto max-h-48">{error.stack}</pre>
                    )}
                </div>
            )}

            <div className="flex gap-4">
                <Button onClick={() => reset()}>Try again</Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Return Home
                </Button>
                <Button variant="secondary" onClick={() => window.open(`mailto:support@edumeetup.com?subject=Crash Report&body=Error: ${error.message}%0D%0ADigest: ${error.digest || 'N/A'}`, '_blank')}>
                    Report Issue
                </Button>
            </div>
        </div>
    )
}
