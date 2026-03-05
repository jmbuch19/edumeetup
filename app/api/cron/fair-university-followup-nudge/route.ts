import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * Fair University Follow-Up Nudge
 * Sends a follow-up prompt to university reps for leads with followUpStatus = PENDING
 * where the fair ended > 48h ago and no follow-up has been taken.
 * Called by the agent Netlify function (hourly).
 * Secured with CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = request.headers.get('Authorization')
        if (auth !== `Bearer ${cronSecret}`) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    try {
        // Find completed fairs that ended more than 48h ago
        const staleFairs = await prisma.fairEvent.findMany({
            where: {
                status: 'COMPLETED',
                endedAt: { lte: fortyEightHoursAgo },
            },
            select: { id: true, name: true },
        })

        if (staleFairs.length === 0) {
            return NextResponse.json({ success: true, nudgesSent: 0 })
        }

        // Find pending attendances in those fairs — group by university
        const pendingAttendances = await prisma.fairAttendance.groupBy({
            by: ['universityId', 'fairEventId'],
            where: {
                fairEventId: { in: staleFairs.map(f => f.id) },
                followUpStatus: 'PENDING',
            },
            _count: { id: true },
        })

        let nudgesSent = 0
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.edumeetup.com'

        for (const group of pendingAttendances) {
            try {
                const university = await prisma.university.findUnique({
                    where: { id: group.universityId },
                    select: { repEmail: true, repName: true, institutionName: true },
                })
                if (!university?.repEmail) continue

                const fair = staleFairs.find(f => f.id === group.fairEventId)
                const count = group._count.id
                const repName = university.repName ?? 'there'
                const reportUrl = `${baseUrl}/dashboard/university/fair-report/${group.fairEventId}`

                await sendEmail({
                    to: university.repEmail,
                    subject: `📋 ${count} leads from ${fair?.name ?? 'the fair'} need follow-up`,
                    html: generateEmailHtml(
                        `Follow up with your fair leads`,
                        `<p>Hi ${repName},</p>
                         <p>You have <strong>${count} student lead${count === 1 ? '' : 's'}</strong> from <strong>${fair?.name ?? 'the recent fair'}</strong> still waiting for follow-up.</p>
                         <p>A quick personalised message to each student significantly improves your conversion rate.</p>
                         <p style="text-align:center;margin-top:24px;">
                           <a href="${reportUrl}" class="btn">View Leads & Follow Up →</a>
                         </p>
                         <p style="font-size:13px;color:#94a3b8;">
                           Students who don't hear back within 72 hours are 3× less likely to express interest.
                         </p>`
                    ),
                })
                nudgesSent++
            } catch (err) {
                console.error(`[fair-university-followup-nudge] Failed for university=${group.universityId}:`, err)
            }
        }

        return NextResponse.json({ success: true, nudgesSent })
    } catch (error) {
        console.error('[fair-university-followup-nudge] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
