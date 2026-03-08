/**
 * lib/sentry-action.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Server Action wrapper for Sentry instrumentation.
 *
 * Usage — wrap any Server Action function:
 *
 *   export const myAction = withSentryAction("myAction", async (formData) => {
 *     // your action logic
 *   })
 *
 * What it does:
 *   1. Creates a Sentry performance span for the action (visible in perf dashboard)
 *   2. Resolves the current session user and attaches them to the Sentry scope
 *   3. On uncaught error: captures to Sentry with action name tag, then re-throws
 *      so Next.js can still show the error boundary to the user
 */

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";

type AnyFn = (...args: unknown[]) => Promise<unknown>;

export function withSentryAction<T extends AnyFn>(
    actionName: string,
    fn: T
): T {
    return (async (...args: Parameters<T>) => {
        return Sentry.withScope(async (scope) => {
            // Tag every event from this scope with the action name
            scope.setTag("server_action", actionName);
            scope.setTransactionName(`server_action:${actionName}`);

            // Best-effort: attach the user to the scope
            try {
                const session = await auth();
                if (session?.user) {
                    scope.setUser({
                        id: session.user.id ?? undefined,
                        email: session.user.email ?? undefined,
                        username: session.user.email ?? undefined,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        role: (session.user as any).role,
                    });
                }
            } catch {
                // Auth resolution failed — proceed without user context
            }

            // Execute the action inside a Sentry span for perf tracking
            return Sentry.startSpan(
                { name: `server_action:${actionName}`, op: "server_action" },
                async () => {
                    try {
                        return await fn(...args);
                    } catch (error) {
                        // Ignore Next.js redirect/notFound — they're control-flow, not errors
                        const msg = error instanceof Error ? error.message : String(error);
                        if (msg === "NEXT_REDIRECT" || msg === "NEXT_NOT_FOUND") {
                            throw error;
                        }

                        Sentry.captureException(error, {
                            tags: { server_action: actionName },
                        });
                        throw error; // re-throw so error.tsx renders
                    }
                }
            );
        });
    }) as T;
}
