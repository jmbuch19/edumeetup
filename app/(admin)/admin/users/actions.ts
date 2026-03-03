'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Required fields used for profileComplete calculation ──────────────────────
const REQUIRED_STUDENT_FIELDS = [
    'fullName', 'phone', 'city', 'country',
    'fieldOfInterest', 'preferredDegree', 'preferredCountries', 'currentStatus',
] as const

async function requireAdmin() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')
    return session
}

// ── Sync profile complete flag for one student ────────────────────────────────
export async function syncProfileComplete(studentId: string) {
    await requireAdmin()

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) return { error: 'Student not found' }

    const isComplete = REQUIRED_STUDENT_FIELDS.every(
        (f) => !!student[f as keyof typeof student]
    )

    await prisma.student.update({
        where: { id: studentId },
        data: { profileComplete: isComplete },
    })

    revalidatePath(`/admin/users/${student.userId}`)
    return { success: true, isComplete }
}

// ── Block / Unblock user ──────────────────────────────────────────────────────
export async function blockUser(userId: string) {
    await requireAdmin()
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } })
    revalidatePath(`/admin/users/${userId}`)
    revalidatePath('/admin/users')
    return { success: true }
}

export async function unblockUser(userId: string) {
    await requireAdmin()
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } })
    revalidatePath(`/admin/users/${userId}`)
    revalidatePath('/admin/users')
    return { success: true }
}

// ── Delete user (hard delete, cascades via Prisma) ───────────────────────────
export async function deleteUser(userId: string) {
    await requireAdmin()

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user) return { error: 'User not found' }
    if (user.role === 'ADMIN') return { error: 'Cannot delete admin accounts' }

    await prisma.user.delete({ where: { id: userId } })
    revalidatePath('/admin/users')
    return { success: true }
}

// ── Targeted notifications ────────────────────────────────────────────────────
export async function notifyFilteredStudents(
    studentIds: string[],
    title: string,
    message: string
) {
    await requireAdmin()
    if (!studentIds.length) return { error: 'No students selected' }
    if (!title || !message) return { error: 'Title and message required' }

    await prisma.studentNotification.createMany({
        data: studentIds.map((id) => ({
            studentId: id,
            title,
            message,
            type: 'INFO' as const,
            actionUrl: null,
        })),
        skipDuplicates: true,
    })

    revalidatePath('/admin/users')
    return { success: true, count: studentIds.length }
}
