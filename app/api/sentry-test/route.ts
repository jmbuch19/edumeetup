import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/sentry-test
 * ──────────────────────────────────────────────────────────────────────────────
 * Dev-only endpoint to verify that the Sentry DSN and transport are correctly
 * configured. Throws a test error, captures it to Sentry, and returns the
 * generated event ID.
 *
 * Usage:
 *   curl http://localhost:3000/api/sentry-test
 *
 * Expected response:
 *   { "ok": true, "eventId": "abc123..." }
 *
 * Then check your Sentry dashboard — the event should appear within 30 seconds.
 */
export async function GET() {
    // Hard-block in production — this endpoint must NEVER be reachable in prod
    if (process.env.NEXT_PUBLIC_APP_ENV === "production" || process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const testError = new Error(
        `[Sentry Test] Intentional error fired at ${new Date().toISOString()} — if you see this in Sentry, the integration is working! 🎉`
    );

    const eventId = Sentry.captureException(testError);

    // Flush to ensure the event ships before the Lambda/edge function exits
    await Sentry.flush(2000);

    return NextResponse.json({
        ok: true,
        message: "Test error sent to Sentry. Check your dashboard!",
        eventId,
        timestamp: new Date().toISOString(),
    });
}
