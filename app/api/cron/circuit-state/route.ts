import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * GET /api/cron/circuit-state
 * Schedule: midnight UTC daily (vercel.json).
 * Advances FairCircuit state machine:
 *   PUBLISHED → ONGOING when startDate has passed
 *   ONGOING   → COMPLETED when endDate has passed
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const recentRun = await prisma.systemLog.findFirst({
        where: {
            type: 'CIRCUIT_STATE_MACHINE',
            createdAt: { gte: twoHoursAgo },
            message: 'State machine run complete'
        }
    })
    if (recentRun) {
        return NextResponse.json({ skipped: true, reason: 'Idempotency lock' })
    }

    const now = new Date()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

    // PUBLISHED → ONGOING
    const toOngoing = await prisma.fairCircuit.findMany({
        where: { status: 'PUBLISHED', startDate: { lte: now } }
    })

    for (const circuit of toOngoing) {
        await prisma.fairCircuit.update({
            where: { id: circuit.id },
            data: { status: 'ONGOING' }
        })

        if (process.env.ADMIN_NOTIFICATION_EMAIL) {
            await sendEmail({
                to: process.env.ADMIN_NOTIFICATION_EMAIL,
                subject: `Circuit now LIVE — ${circuit.name}`,
                html: generateEmailHtml(
                    'Circuit Is Now Live',
                    `<p><strong>${circuit.name}</strong> has automatically
                    moved to ONGOING status as of today.</p>
                    <p>The War Room is now active for all participants.</p>
                    <a href="${baseUrl}/admin/fair-ops/${circuit.id}">
                      Open War Room →
                    </a>`
                )
            })
        }

        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                type: 'CIRCUIT_STATE_MACHINE',
                message: `${circuit.name} → ONGOING`,
                metadata: { circuitId: circuit.id }
            }
        })
    }

    // ONGOING → COMPLETED
    const toCompleted = await prisma.fairCircuit.findMany({
        where: { status: 'ONGOING', endDate: { lt: now } }
    })

    for (const circuit of toCompleted) {
        await prisma.fairCircuit.update({
            where: { id: circuit.id },
            data: { status: 'COMPLETED' }
        })

        if (process.env.ADMIN_NOTIFICATION_EMAIL) {
            await sendEmail({
                to: process.env.ADMIN_NOTIFICATION_EMAIL,
                subject: `Circuit COMPLETED — ${circuit.name}`,
                html: generateEmailHtml(
                    'Circuit Completed',
                    `<p><strong>${circuit.name}</strong> has automatically
                    moved to COMPLETED status.</p>
                    <p>All participant access to the War Room has been
                    set to read-only.</p>`
                )
            })
        }

        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                type: 'CIRCUIT_STATE_MACHINE',
                message: `${circuit.name} → COMPLETED`,
                metadata: { circuitId: circuit.id }
            }
        })
    }

    await prisma.systemLog.create({
        data: {
            level: 'INFO',
            type: 'CIRCUIT_STATE_MACHINE',
            message: `State machine run complete`,
            metadata: {
                toOngoing: toOngoing.length,
                toCompleted: toCompleted.length,
                runAt: now.toISOString()
            }
        }
    })

    return NextResponse.json({
        success: true,
        toOngoing: toOngoing.length,
        toCompleted: toCompleted.length
    })
}
