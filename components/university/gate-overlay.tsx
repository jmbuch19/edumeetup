'use client'

/**
 * components/university/gate-overlay.tsx
 *
 * Wraps any content section with a blur + lock plate when the user is not
 * logged in. Clicking anywhere on the overlay routes to /login.
 *
 * Usage:
 *   <GateOverlay locked={!isLoggedIn} label="Sign in to view contact details">
 *     {children}
 *   </GateOverlay>
 *
 * When locked={false} → renders children transparently (zero overhead).
 */

import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

type Props = {
  locked: boolean
  label?: string
  children: React.ReactNode
}

export function GateOverlay({ locked, label = 'Sign in to unlock', children }: Props) {
  const router = useRouter()

  if (!locked) return <>{children}</>

  return (
    <div className="relative">
      {/* Blurred content beneath */}
      <div className="pointer-events-none select-none blur-[5px] opacity-60">
        {children}
      </div>

      {/* Click-trap overlay */}
      <button
        onClick={() => router.push('/login')}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2
                   bg-white/60 backdrop-blur-[2px] rounded-xl
                   border border-primary/20 cursor-pointer
                   transition-colors hover:bg-primary/5 group"
        aria-label={label}
      >
        <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center
                         group-hover:bg-primary/20 transition-colors">
          <Lock className="h-4 w-4 text-primary" />
        </span>
        <span className="text-sm font-semibold text-primary">{label}</span>
        <span className="text-xs text-slate-500">Free account · 30 seconds</span>
      </button>
    </div>
  )
}
