'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function FairOpsDashboardError({
  error, reset
}: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error('[FairOpsDashboard]', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 text-center max-w-sm w-full animate-pop">
        <Calendar className="w-12 h-12 text-[#C9A84C] mx-auto mb-4 animate-float" />
        
        <h2 className="font-fraunces text-xl font-bold text-[#0B1340] mb-2">
          War Room temporarily unavailable
        </h2>
        
        <p className="font-jakarta text-sm text-[#888888] mb-5">
          Your circuit data is safe. Please refresh.
        </p>

        {Sentry.lastEventId() && (
          <p className="text-xs font-mono text-gray-400 mb-5 bg-gray-50 p-2 rounded">
            Error ID: {Sentry.lastEventId()}
          </p>
        )}
        
        <Button variant="gold" onClick={reset} className="w-full">
          Refresh Dashboard
        </Button>
      </div>
    </div>
  )
}
