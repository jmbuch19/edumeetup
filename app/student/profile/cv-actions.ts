'use server'

import { prisma } from '@/lib/prisma'
import { deleteR2File } from '@/lib/r2-delete'
import { revalidatePath } from 'next/cache'

export async function deleteStudentCV(
    studentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        // 1. Fetch student record — get cvUrl
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, cvUrl: true },
        })

        if (!student) {
            return { ok: false, error: 'Student not found.' }
        }

        // 2. If cvUrl exists → delete from R2 (non-fatal)
        if (student.cvUrl) {
            await deleteR2File(student.cvUrl)
        }

        // 3. Clear CV fields in DB
        await prisma.student.update({
            where: { id: studentId },
            data: {
                cvUrl: null,
                cvFileName: null,
                cvUploadedAt: null,
                cvSizeBytes: null,
            },
        })

        // 4. Revalidate profile page
        revalidatePath('/student/profile')

        return { ok: true }
    } catch (err) {
        console.error('[deleteStudentCV]', err)
        return { ok: false, error: 'Failed to remove CV. Please try again.' }
    }
}
