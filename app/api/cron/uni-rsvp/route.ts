import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * GET /api/cron/uni-rsvp
 * Schedule: 9am UTC every Monday (vercel.json).
 * Reminds university admins to assign a Representative for any PUBLISHED
 * circuit starting in less than 30 days that still has no rep assigned.
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
        where: { type: 'UNI_RSVP_CRON', createdAt: { gte: twoHoursAgo } }
    })
    if (recentRun) {
        return NextResponse.json({ skipped: true, reason: 'Idempotency lock' })
    }

    const now = new Date()
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

    const missingReps = await prisma.circuitRegistration.findMany({
        where: {
            repId: null,
            circuit: {
                status: 'PUBLISHED',
                startDate: { gt: now, lt: thirtyDaysFromNow }
            }
        },
        include: { university: true, circuit: true }
    })

    let emailsSent = 0
    for (const reg of missingReps) {
        const admins = await prisma.user.findMany({
            where: { universityId: reg.universityId, role: UserRole.UNIVERSITY }
        })

        for (const admin of admins) {
            await sendEmail({
                to: admin.email,
                subject: `Action Required: Assign Representative for ${reg.circuit.name}`,
                html: generateEmailHtml(
                    'Action Required',
                    `<p>Hi ${admin.name || 'there'},</p>
                    <p>Your university is registered for <strong>${reg.circuit.name}</strong>, which starts in less than 30 days!</p>
                    <p>However, you have not yet assigned a Representative to this circuit. Your account will not be fully activated in the War Room until a Representative is assigned.</p>
                    <p><a href="${baseUrl}/university/fairs">Assign Representative Now →</a></p>`
                )
            })
            emailsSent++
        }
    }

    await prisma.systemLog.create({
        data: {
            level: 'INFO',
            type: 'UNI_RSVP_CRON',
            message: `Sent ${emailsSent} reminder emails to universities missing rep assignments for upcoming circuits.`,
            metadata: { emailsSent, circuitsCount: missingReps.length }
        }
    })

    return NextResponse.json({ success: true, emailsSent, circuitsCount: missingReps.length })
}
