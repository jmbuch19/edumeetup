import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const consentSchema = z.object({
    consentMarketing: z.boolean().optional(),
    consentAnalytics: z.boolean().optional(),
})

/**
 * PATCH /api/my-data/consent
 * Updates marketing/analytics consent flags and records every change in ConsentHistory.
 * Only stamps consentWithdrawnAt when ALL consents are being turned off.
 * Clears consentWithdrawnAt if any consent is being restored.
 */
export async function PATCH(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = consentSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { consentMarketing, consentAnalytics } = parsed.data

    if (consentMarketing === undefined && consentAnalytics === undefined) {
        return NextResponse.json({ error: 'No consent fields provided' }, { status: 400 })
    }

    const userId = session.user.id

    // Load current values to generate history records
    const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { consentMarketing: true, consentAnalytics: true }
    })
    if (!current) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const historyEntries: { userId: string; field: string; oldValue: boolean; newValue: boolean }[] = []

    if (consentMarketing !== undefined && consentMarketing !== current.consentMarketing) {
        historyEntries.push({
            userId,
            field: 'consentMarketing',
            oldValue: current.consentMarketing,
            newValue: consentMarketing,
        })
    }
    if (consentAnalytics !== undefined && consentAnalytics !== current.consentAnalytics) {
        historyEntries.push({
            userId,
            field: 'consentAnalytics',
            oldValue: current.consentAnalytics,
            newValue: consentAnalytics,
        })
    }

    // Determine effective post-update values
    const effectiveMarketing = consentMarketing ?? current.consentMarketing
    const effectiveAnalytics = consentAnalytics ?? current.consentAnalytics

    // Stamp consentWithdrawnAt when ALL consents are off; clear it when any is restored
    const allWithdrawn = !effectiveMarketing && !effectiveAnalytics
    const consentWithdrawnAt = allWithdrawn ? new Date() : null

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                ...(consentMarketing !== undefined ? { consentMarketing } : {}),
                ...(consentAnalytics !== undefined ? { consentAnalytics } : {}),
                consentWithdrawnAt,
            }
        }),
        ...historyEntries.map(entry => prisma.consentHistory.create({ data: entry }))
    ])

    return NextResponse.json({
        success: true,
        consentMarketing: effectiveMarketing,
        consentAnalytics: effectiveAnalytics,
        consentWithdrawnAt,
    })
}
