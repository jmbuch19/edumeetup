import { prisma } from '@/lib/prisma'

interface StudentNotifyPayload {
    title: string
    message: string
    type?: string
    actionUrl?: string
}

interface UniversityNotifyPayload {
    title: string
    message: string
    type?: string
    actionUrl?: string
}

/**
 * Write an in-app notification to a student's bell.
 * Never throws — a failed notification must not break the calling action.
 */
export async function notifyStudent(studentId: string, payload: StudentNotifyPayload) {
    try {
        await prisma.studentNotification.create({
            data: {
                studentId,
                title: payload.title,
                message: payload.message,
                type: payload.type ?? 'INFO',
                actionUrl: payload.actionUrl ?? null,
            }
        })
    } catch (e) {
        console.error('[notifyStudent] Failed:', e)
    }
}

/**
 * Write an in-app notification to a university's bell.
 * Never throws — a failed notification must not break the calling action.
 */
export async function notifyUniversity(universityId: string, payload: UniversityNotifyPayload) {
    try {
        await prisma.universityNotification.create({
            data: {
                universityId,
                title: payload.title,
                message: payload.message,
                type: payload.type ?? 'INFO',
                actionUrl: payload.actionUrl ?? null,
            }
        })
    } catch (e) {
        console.error('[notifyUniversity] Failed:', e)
    }
}
