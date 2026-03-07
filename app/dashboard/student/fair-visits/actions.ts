'use server'

import { prisma } from '@/lib/prisma'

// ── 1. Send a fair message ────────────────────────────────────────────────────
export async function sendFairMessage(
    attendanceId: string,
    studentId: string,      // Student record id
    body: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!attendanceId || !studentId || !body.trim()) {
        return { success: false, error: 'Missing required fields' }
    }
    if (body.length > 1000) {
        return { success: false, error: 'Message too long (max 1000 chars)' }
    }

    try {
        const msg = await prisma.fairMessage.create({
            data: {
                fairAttendanceId: attendanceId,
                senderRole: 'STUDENT',
                senderId: studentId,
                content: body.trim(),
            },
        })

        return { success: true, messageId: msg.id }
    } catch (error) {
        console.error('[sendFairMessage] Error:', error)
        return { success: false, error: 'Failed to send message' }
    }
}

// ── 2. Save to shortlist (idempotent) ────────────────────────────────────────
export async function saveToShortlist(
    studentId: string,
    universityId: string,
): Promise<{ success: boolean; alreadySaved?: boolean; error?: string }> {
    if (!studentId || !universityId) {
        return { success: false, error: 'Missing parameters' }
    }

    try {
        await prisma.bookmark.upsert({
            where: { studentId_universityId: { studentId, universityId } },
            create: { studentId, universityId },
            update: {}, // no-op if already exists
        })
        return { success: true }
    } catch (error) {
        console.error('[saveToShortlist] Error:', error)
        return { success: false, error: 'Failed to save shortlist' }
    }
}
