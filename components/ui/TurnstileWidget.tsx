// components/ui/TurnstileWidget.tsx
// Drop-in Turnstile widget — invisible to real users
// Renders a hidden div that Cloudflare uses to verify humanity

'use client'

import { useEffect, useRef } from 'react'

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: object) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey) {
      // Site key not configured — skip widget and unblock form immediately.
      // Server-side verifyTurnstile will also pass when TURNSTILE_SECRET_KEY is unset.
      console.warn('[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY not set — skipping widget')
      onVerify('')
      return
    }

    let timeoutId: ReturnType<typeof setTimeout>

    function renderWidget() {
      if (!containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        // Cloudflare removed the `size: 'invisible'` option. The modern way to
        // stay invisible to real users is a flexible-size widget with
        // `appearance: 'interaction-only'` — only rendered if a challenge is needed.
        size: 'flexible',
        appearance: 'interaction-only',
        callback: (token: string) => {
          clearTimeout(timeoutId)
          onVerify(token)
        },
        'expired-callback': () => {
          onExpire?.()
        },
        'error-callback': () => {
          // If Cloudflare can't be reached (ad blocker / network blip),
          // unblock the form — server-side is the real security gate.
          clearTimeout(timeoutId)
          console.warn('[turnstile] Widget error — falling back to server-side check only')
          onVerify('')
          onError?.()
        },
      })

      // Safety net: if the invisible widget never fires (e.g. partial CSP block),
      // unblock the form after 8 seconds so the user isn't permanently stuck.
      timeoutId = setTimeout(() => {
        console.warn('[turnstile] Widget timeout — unblocking form after 8s')
        onVerify('')
      }, 8000)
    }

    // Load Turnstile script if not already loaded
    if (window.turnstile) {
      renderWidget()
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = renderWidget
      // If script fails to load entirely, unblock the form
      script.onerror = () => {
        console.warn('[turnstile] Script failed to load — unblocking form')
        onVerify('')
      }
      document.head.appendChild(script)
    }

    return () => {
      clearTimeout(timeoutId)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [onVerify, onExpire, onError])

  return <div ref={containerRef} />
}
