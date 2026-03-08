/**
 * instrumentation.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Next.js 15 server/edge instrumentation file.
 * @sentry/nextjs v10+ requires Sentry.init() to be called inside register()
 * rather than in the legacy sentry.server.config.ts / sentry.edge.config.ts files.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register() {
    const isProd = process.env.NEXT_PUBLIC_APP_ENV === "production";
    const sentryCommon = {
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
        release: process.env.NEXT_PUBLIC_APP_VERSION,
        debug: false,
        ignoreErrors: [
            "NEXT_REDIRECT",
            "NEXT_NOT_FOUND",
        ],
    };

    if (process.env.NEXT_RUNTIME === "nodejs") {
        const Sentry = await import("@sentry/nextjs");
        Sentry.init({
            ...sentryCommon,
            // Sample 20% in prod to keep quota under control; 100% locally.
            tracesSampleRate: isProd ? 0.2 : 1.0,
            integrations: [
                // Automatically traces every Prisma query
                Sentry.prismaIntegration(),
            ],
        });
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        const Sentry = await import("@sentry/nextjs");
        Sentry.init({
            ...sentryCommon,
            // Edge runs on every request — keep trace rate minimal in prod
            tracesSampleRate: isProd ? 0.05 : 1.0,
        });
    }
}
