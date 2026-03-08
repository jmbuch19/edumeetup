'use client'

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const [eventId, setEventId] = useState<string | null>(null)
    const isDev = process.env.NODE_ENV === 'development'

    useEffect(() => {
        // Capture to Sentry and store the event ID so users can quote it
        const id = Sentry.captureException(error)
        setEventId(id ?? null)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
            <p className="text-gray-600 mb-4 max-w-md">
                We apologize for the inconvenience. Our team has been automatically notified.
            </p>

            {/* Event ID — helps correlate user reports to Sentry events */}
            {eventId && (
                <p className="text-xs font-mono text-gray-400 mb-4">
                    Reference ID: <span className="select-all">{eventId}</span>
                </p>
            )}

            {/* Raw error details — dev only so we don't leak internals to users in prod */}
            {isDev && (
                <div className="mb-6 max-w-2xl w-full text-left bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs font-mono font-bold text-red-700 mb-1">ERROR (dev only):</p>
                    <p className="text-sm font-mono text-red-800 break-all">{error.message || '(no message)'}</p>
                    {error.digest && (
                        <p className="text-xs font-mono text-red-500 mt-1">Digest: {error.digest}</p>
                    )}
                    {error.stack && (
                        <pre className="text-xs font-mono text-red-600 mt-2 whitespace-pre-wrap overflow-auto max-h-48">
                            {error.stack}
                        </pre>
                    )}
                </div>
            )}

            <div className="flex gap-4 flex-wrap justify-center">
                <Button onClick={() => reset()}>Try again</Button>
                <Button variant="outline" onClick={() => { window.location.href = '/' }}>
                    Return Home
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => window.open(
                        `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@edumeetup.com'}` +
                        `?subject=Crash Report&body=` +
                        `Error: ${encodeURIComponent(error.message)}%0D%0A` +
                        `Reference ID: ${encodeURIComponent(eventId ?? 'N/A')}%0D%0A` +
                        `Digest: ${encodeURIComponent(error.digest ?? 'N/A')}`,
                        '_blank'
                    )}
                >
                    Report Issue
                </Button>
            </div>
        </div>
    )
}
