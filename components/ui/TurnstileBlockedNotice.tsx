'use client'

/**
 * Shown when the Turnstile widget could not run (it reported an empty token).
 * Explains why the form is blocked and offers a retry instead of an endless spinner.
 */
export function TurnstileBlockedNotice({ onRetry, hint }: { onRetry: () => void; hint?: string }) {
    return (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
                Our security check couldn&apos;t load in this browser. This is usually caused by an ad blocker,
                a privacy setting or a network filter. Allow <code>challenges.cloudflare.com</code>, then retry.
                {hint ? ` ${hint}` : ''}
            </p>
            <button type="button" onClick={onRetry} className="mt-2 font-medium underline underline-offset-2">
                Retry security check
            </button>
        </div>
    )
}
