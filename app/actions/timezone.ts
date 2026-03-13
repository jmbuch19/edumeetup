'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function syncUserTimezone(detectedTimezone: string) {
    if (!detectedTimezone) return { success: false }
    
    // Attempt to grab session
    const session = await auth()
    if (!session?.user?.email) return { success: false }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, timezone: true, role: true, universityId: true }
        })

        if (!user) return { success: false }
        if (user.timezone === detectedTimezone) return { success: true } // Already in sync

        // Update the User's physical location timezone
        await prisma.user.update({
            where: { id: user.id },
            data: { timezone: detectedTimezone }
        })

        // Retroactively update upcoming meetings based on Role
        const now = new Date()

        if (user.role === 'STUDENT') {
            const student = await prisma.student.findUnique({ where: { userId: user.id } })
            if (student) {
                await prisma.meeting.updateMany({
                    where: {
                        studentId: student.id,
                        startTime: { gt: now },
                        status: { notIn: ['CANCELLED', 'COMPLETED'] }
                    },
                    data: {
                        studentTimezone: detectedTimezone
                    }
                })
            }
        } else if (user.role === 'UNIVERSITY' && user.universityId) {
            await prisma.meeting.updateMany({
                where: {
                    universityId: user.universityId,
                    startTime: { gt: now },
                    status: { notIn: ['CANCELLED', 'COMPLETED'] }
                },
                data: {
                    repTimezone: detectedTimezone
                }
            })
        }

        return { success: true }
    } catch (e) {
        console.error("Failed to sync timezone:", e)
        return { success: false }
    }
}
