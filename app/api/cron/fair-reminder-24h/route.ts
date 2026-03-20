import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * Fair Reminder — 24h before fair starts
 * Sends a reminder email to all registered students whose fair starts in ~24 hours.
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
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    try {
        // Find fairs starting in the next 24–25h window (1h run window)
        const upcomingFairs = await prisma.fairEvent.findMany({
            where: {
                status: 'UPCOMING',
                startDate: { gte: in24h, lte: in25h },
            },
            include: {
                studentPasses: {
                    select: { id: true, email: true, fullName: true, uuid: true },
                },
            },
        })

        let sent = 0
        const errors: string[] = []
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.edumeetup.com'

        for (const fair of upcomingFairs) {
            for (const pass of fair.studentPasses) {
                try {
                    const firstName = (pass.fullName ?? 'there').split(' ')[0]
                    const qrUrl = `${baseUrl}/scan/${pass.uuid}`

                    await sendEmail({
                        to: pass.email,
                        subject: `⏰ Reminder: ${fair.name} starts tomorrow!`,
                        html: generateEmailHtml(
                            `See you tomorrow at ${fair.name}`,
                            `<p>Hi ${firstName},</p>
                             <p>Just a reminder — <strong>${fair.name}</strong> starts <strong>tomorrow</strong>!</p>
                             ${fair.venue ? `<p>📍 Venue: ${fair.venue}${fair.city ? `, ${fair.city}` : ''}</p>` : ''}
                             <p>Your QR pass is ready. Show it at each university booth to connect:</p>
                             <p style="text-align:center;margin-top:24px;">
                               <a href="${qrUrl}" class="btn">View My QR Pass →</a>
                             </p>
                             <p style="font-size:13px;color:#94a3b8;">
                               If you can no longer attend, no action needed — your data is kept for 90 days then deleted automatically.
                             </p>`
                        ),
                    })
                    sent++
                } catch (err) {
                    console.error(`[fair-reminder-24h] Failed to send to pass id=${pass.id}:`)
                    errors.push(pass.id)
                }
            }
        }

        return NextResponse.json({
            success: true,
            fairsFound: upcomingFairs.length,
            remindersSent: sent,
            ...(errors.length > 0 ? { errors } : {}),
        })
    } catch (error) {
        console.error('[fair-reminder-24h] Error:')
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
