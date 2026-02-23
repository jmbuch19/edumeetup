/**
 * Weekly domain cache refresh endpoint.
 * 
 * Schedule this via Netlify Scheduled Functions:
 * In netlify.toml:
 *   [functions."refresh-university-domains"]
 *     schedule = "@weekly"
 * 
 * Or trigger manually:
 *   GET /api/refresh-university-domains?secret=uni-refresh-secret-2025
 */
import { NextResponse } from 'next/server'
import { refreshDomains } from '@/lib/university-domains'

export const dynamic = 'force-dynamic'

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
            domainCount: result.count,
            message: `University domain cache refreshed successfully with ${result.count} domains.`,
        })
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        )
    }
}
