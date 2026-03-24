'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import * as Sentry from '@sentry/nextjs'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FF] px-4">
      <div className="glass-card rounded-2xl p-10 text-center max-w-md w-full animate-pop">
        <div className="text-5xl mb-4 animate-float inline-block">🔧</div>
        
        <h1 className="font-fraunces text-2xl font-bold text-[#0B1340] mb-3">
          Something went wrong
        </h1>
        
        <p className="font-jakarta text-sm text-[#888888] mb-6 leading-relaxed">
          We hit an unexpected error. Your data is safe.
          Please try again — if it persists, contact support.
        </p>

        {Sentry.lastEventId() && (
          <p className="text-xs font-mono text-gray-400 mb-6 bg-gray-50 p-2 rounded">
            Error ID: {Sentry.lastEventId()}
          </p>
        )}
        
        <div className="flex gap-3 justify-center">
          <Button variant="gold" onClick={reset}>
            Try Again
          </Button>
          <Button variant="outline-indigo" onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-4 text-xs text-red-400 font-mono text-left bg-red-50 rounded p-2 break-all">
            {error.message}
          </p>
        )}
      </div>
    </div>
  )
}
