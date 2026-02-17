import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    // 1. Verify Authentication (Vercel Cron usually sends a header, or we can use a secret)
    // For MVP we can check a simple secret if provided, or just allow it if we assume Vercel protection.
    // Ideally: if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) ...

    try {
        const now = new Date()

        // 2. Find meetings that should be completed
        // Status CONFIRMED and End Time < Now
        // End Time = proposedDatetime + durationMinutes
        // Prisma doesn't support computed columns in where easily purely in DB without raw query or iterating.
        // For MVP/small scale: Fetch CONFIRMED meetings in the past, then filter by duration.
        // Optimization: Fetch meetings where proposedDatetime < now - max_duration (e.g. 2 hours) to be safe.

        const potentialMeetings = await prisma.meetingRequest.findMany({
            where: {
                status: 'CONFIRMED',
                proposedDatetime: {
                    lt: now // Started in the past
                }
            }
        })

        let completedCount = 0

        for (const mtg of potentialMeetings) {
            const entTime = new Date(mtg.proposedDatetime.getTime() + mtg.durationMinutes * 60000)

            if (entTime < now) {
                // Determine who is the "system" user? Or just leave byUserId null?
                // Schema allows byUserId in AuditLog? Let's check.

                await prisma.$transaction(async (tx) => {
                    await tx.meetingRequest.update({
                        where: { id: mtg.id },
                        data: { status: 'COMPLETED' }
                    })

                    await (tx as any).meetingAuditLog.create({
                        data: {
                            meetingId: mtg.id,
                            action: 'STATUS_CHANGE',
                            oldStatus: 'CONFIRMED',
                            newStatus: 'COMPLETED',
                            byUserId: 'SYSTEM',
                            metadata: { reason: 'Auto-completed by Cron' } as any
                        }
                    })
                })
                completedCount++
            }
        }

        return NextResponse.json({ success: true, completed: completedCount })
    } catch (error: any) {
        console.error('Cron job failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
