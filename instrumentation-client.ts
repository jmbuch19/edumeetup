/**
 * instrumentation-client.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Next.js 15 client instrumentation entry point.
 * @sentry/nextjs v10+ requires Sentry.init() to be called here (not in
 * sentry.client.config.ts) when using the instrumentation file convention.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NEXT_PUBLIC_APP_ENV === "production";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // ── Environment & Release ────────────────────────────────────────────────
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // ── Performance Tracing ──────────────────────────────────────────────────
    tracesSampleRate: isProd ? 0.2 : 1.0,

    // ── Session Replay ───────────────────────────────────────────────────────
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: false,
        }),
        Sentry.browserTracingIntegration(),
    ],
    replaysSessionSampleRate: 0,   // Never record normal sessions (saves quota)
    replaysOnErrorSampleRate: 1.0, // Always replay erroring sessions

    // ── Misc ─────────────────────────────────────────────────────────────────
    debug: false,
    ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
        "Load failed",
        "Failed to fetch",
        "NetworkError",
        /^chrome-extension:\/\//,
        /^moz-extension:\/\//,
    ],
});

// Required by @sentry/nextjs v10 to instrument client-side navigations in Next.js 15
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
