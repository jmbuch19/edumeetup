import type { Config } from '@netlify/functions'

/**
 * Native Netlify scheduler for both meeting reminder pipelines.
 * The incoming invocation is trusted as a Netlify Scheduled Function.
 * CRON_SECRET is used only for the outbound calls to the protected HTTP routes.
 */
export default async function handler(): Promise<Response> {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'https://www.edumeetup.com').replace(/\/$/, '')
    const routes = [
        '/api/cron/reminders',
        '/api/cron/session-reminders',
    ]

    const results = await Promise.all(routes.map(async route => {
        try {
            const response = await fetch(`${appUrl}${route}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${cronSecret}` },
            })
            const body = await response.text()
            return { route, ok: response.ok, status: response.status, body: body.slice(0, 1000) }
        } catch (error) {
            return { route, ok: false, status: 0, body: error instanceof Error ? error.message : 'Request failed' }
        }
    }))

    const ok = results.every(result => result.ok)
    return new Response(JSON.stringify({ ok, results }), {
        status: ok ? 200 : 502,
        headers: { 'Content-Type': 'application/json' },
    })
}

export const config: Config = { schedule: '*/15 * * * *' }
