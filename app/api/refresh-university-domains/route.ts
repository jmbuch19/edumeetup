/**
 * University Domain Cache Refresh Endpoint
 *
 * Refreshes both the Hipo university map and the disposable-email-domains blocklist.
 *
 * Netlify Scheduled Function — runs automatically every Sunday at midnight UTC.
 * Can also be triggered manually:
 *   GET /api/refresh-university-domains?secret=uni-refresh-secret-2025
 */
import { NextResponse } from 'next/server'
import { refreshDomains } from '@/lib/university-domains'

export const dynamic = 'force-dynamic'

// ─── Netlify Scheduled Function cron config ───────────────────────────────────
// Runs every Sunday at 00:00 UTC
export const config = {
    schedule: '0 0 * * 0',
}

const REFRESH_SECRET = 'uni-refresh-secret-2025'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== REFRESH_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await refreshDomains()
        return NextResponse.json({
            success: true,
            updatedAt: result.updatedAt,
            universityDomainCount: result.universityCount,
            disposableDomainCount: result.disposableCount,
            message: `Cache refreshed — ${result.universityCount} university domains, ${result.disposableCount} disposable domains blocked.`,
        })
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
    }
}
