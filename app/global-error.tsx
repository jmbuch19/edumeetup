'use client'

import * as Sentry from "@sentry/nextjs";
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Root layout is broken — this is the most severe crash category.
        // Always capture, regardless of environment.
        Sentry.captureException(error)
    }, [error])

    return (
        // global-error MUST include its own <html> and <body>
        // because the root layout itself has crashed.
        <html lang="en">
            <body style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                color: '#111827',
            }}>
                <div style={{ maxWidth: 480 }}>
                    {/* Logo */}
                    <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.5px' }}>
                        Ed<span style={{ color: '#3333CC' }}>U</span>meetup
                    </div>

                    <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
                        Something went seriously wrong
                    </h1>
                    <p style={{ color: '#6b7280', marginBottom: 20 }}>
                        A critical error occurred. Our team has been automatically notified.
                    </p>

                    {/* Event ID — lets users quote it in support tickets */}
                    {Sentry.lastEventId() && (
                        <p style={{
                            fontSize: 12,
                            fontFamily: 'monospace',
                            color: '#9ca3af',
                            background: '#f3f4f6',
                            padding: '8px 12px',
                            borderRadius: 6,
                            marginBottom: 20,
                        }}>
                            Error ID: {Sentry.lastEventId()}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                            onClick={reset}
                            style={{
                                padding: '10px 20px',
                                background: '#3333CC',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 14,
                            }}
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => { window.location.href = '/' }}
                            style={{
                                padding: '10px 20px',
                                background: 'white',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 14,
                            }}
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
