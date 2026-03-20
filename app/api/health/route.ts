import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// T14: Serverless health probe for platform orchestrators
export async function GET() {
    try {
        const result = await prisma.$queryRaw`SELECT NOW()`
        return NextResponse.json({ status: 'ok', timestamp: result }, { status: 200 })
    } catch (error: any) {
        console.error('[HealthCheck] DB ping failed:', error.message)
        return NextResponse.json({ status: 'error', message: 'Database connection failed' }, { status: 503 })
    }
}
