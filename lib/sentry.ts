/**
 * lib/sentry.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Centralised Sentry helpers for EdUmeetup.
 *
 * Import from this module instead of @sentry/nextjs directly so that:
 *   1. We get consistent context enrichment on every capture
 *   2. There is a single place to disable/swap SDKs in future
 *
 * Usage:
 *   import { captureServerError, setSentryUser } from "@/lib/sentry"
 */

import * as Sentry from "@sentry/nextjs";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SentryUser {
    id: string;
    email?: string | null;
    role?: string;
}

export interface ServerErrorContext {
    /** Human-readable name for the failing operation, e.g. "getDashboardData" */
    action?: string;
    /** Any structured metadata to attach to the Sentry event */
    extra?: Record<string, unknown>;
    /** Tags for filtering in Sentry dashboard */
    tags?: Record<string, string>;
}

// ── Error capture ────────────────────────────────────────────────────────────

/**
 * Capture an error on the server side with optional context.
 * Safe to call from Server Components, Route Handlers, and Server Actions.
 */
export function captureServerError(
    error: unknown,
    ctx?: ServerErrorContext
): void {
    Sentry.withScope((scope) => {
        if (ctx?.action) scope.setTag("action", ctx.action);
        if (ctx?.tags) {
            Object.entries(ctx.tags).forEach(([k, v]) => scope.setTag(k, v));
        }
        if (ctx?.extra) {
            Object.entries(ctx.extra).forEach(([k, v]) => scope.setExtra(k, v));
        }
        Sentry.captureException(error);
    });
}

// ── User context ─────────────────────────────────────────────────────────────

/**
 * Set the currently authenticated user on the Sentry scope.
 * Call this once per request on the server (layout, middleware) or on mount (client).
 * Every subsequent event from the same scope carries this user context.
 */
export function setSentryUser(user: SentryUser): void {
    Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
        username: user.email ?? undefined,
        // Custom attribute — visible in Sentry event detail
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: user.role as any,
    });
}

/**
 * Clear the Sentry user scope (call on sign-out so errors aren't mis-attributed).
 */
export function clearSentryUser(): void {
    Sentry.setUser(null);
}

// ── Re-exports ───────────────────────────────────────────────────────────────
// Expose the raw SDK helpers so consumers don't also need to import @sentry/nextjs

export { Sentry };
