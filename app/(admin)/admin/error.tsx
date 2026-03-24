'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function AdminDashboardError({
  error, reset
}: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error('[AdminDashboard]', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center max-w-sm w-full">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        
        <h2 className="font-fraunces text-xl font-bold text-[#0B1340] mb-2">
          Admin panel error
        </h2>
        
        <p className="font-jakarta text-sm text-[#888888] mb-2">
          An error occurred in the admin panel.
        </p>

        {Sentry.lastEventId() && (
          <p className="text-xs text-red-500 font-mono mb-4 bg-white rounded p-2">
            Error ID: {Sentry.lastEventId()}
          </p>
        )}

        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-red-500 font-mono mb-4 text-left bg-white rounded p-2 break-all">
            {error.message}
          </p>
        )}
        
        <Button variant="outline-indigo" onClick={reset} className="w-full">
          Retry
        </Button>
      </div>
    </div>
  )
}
