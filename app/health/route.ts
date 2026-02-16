import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        // Check DB connection
        await prisma.$queryRaw`SELECT 1`

        return NextResponse.json(
            { status: 'ok', timestamp: new Date().toISOString() },
            { status: 200 }
        )
    } catch {
        return NextResponse.json(
            { status: 'error', message: 'Database unreachable' },
            { status: 503 }
        )
    }
}
