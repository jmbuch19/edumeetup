import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * Fair Morning Scanner Reminder
 * Sends a morning briefing to university reps on the day of a LIVE fair.
 * Reminds them to open the scanner and shows their current lead count.
 * Runs once per day at ~7:00 AM via the agent Netlify function.
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

    try {
        const liveFairs = await prisma.fairEvent.findMany({
            where: { status: 'LIVE' },
            select: { id: true, name: true, venue: true, city: true },
        })

        if (liveFairs.length === 0) {
            return NextResponse.json({ success: true, remindersSent: 0 })
        }

        const liveFairIds = liveFairs.map(f => f.id)

        // Find universities that have attendances in a live fair
        const participatingUniversities = await prisma.university.findMany({
            where: {
                fairAttendances: {
                    some: { fairEventId: { in: liveFairIds } },
                },
            },
            select: {
                id: true,
                repEmail: true,
                repName: true,
                institutionName: true,
                fairAttendances: {
                    where: { fairEventId: { in: liveFairIds } },
                    select: { fairEventId: true, id: true },
                },
            },
        })

        let remindersSent = 0
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.edumeetup.com'
        // ⚠️ NEXT_PUBLIC_APP_URL must be set in Netlify env vars

        for (const uni of participatingUniversities) {
            if (!uni.repEmail) continue

            try {
                const leadCount = uni.fairAttendances.length
                const repName = uni.repName ?? 'there'
                const fairId = uni.fairAttendances[0]?.fairEventId
                if (!fairId) continue

                const fair = liveFairs.find(f => f.id === fairId)
                const scannerUrl = `${baseUrl}/event/${fairId}/scan`
                const reportUrl = `${baseUrl}/dashboard/university/fair-report/${fairId}`

                await sendEmail({
                    to: uni.repEmail,
                    subject: `🌅 Good morning! ${fair?.name ?? 'Your fair'} is LIVE today`,
                    html: generateEmailHtml(
                        `Today's fair is live — good luck!`,
                        `<p>Hi ${repName},</p>
                         <p><strong>${fair?.name ?? 'The fair'}</strong> is live today${fair?.venue ? ` at ${fair.venue}` : ''}${fair?.city ? `, ${fair.city}` : ''}.</p>
                         ${leadCount > 0 ? `<p>You already have <strong>${leadCount} lead${leadCount === 1 ? '' : 's'}</strong> scanned. Keep going!</p>` : ''}
                         <div style="text-align:center;margin-top:24px;">
                           <a href="${scannerUrl}" class="btn">Open QR Scanner →</a>
                         </div>
                         <p style="margin-top:16px;text-align:center;">
                           <a href="${reportUrl}" style="color:#6366f1;font-size:13px;">View today's leads report</a>
                         </p>
                         <p style="font-size:13px;color:#94a3b8;margin-top:16px;">
                           Have a productive fair! 🎯
                         </p>`
                    ),
                })
                remindersSent++
            } catch (err) {
                console.error(`[fair-morning-scanner-reminder] Failed for university=${uni.id}:`)
            }
        }

        return NextResponse.json({ success: true, liveFairs: liveFairs.length, remindersSent })
    } catch (error) {
        console.error('[fair-morning-scanner-reminder] Error:')
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
