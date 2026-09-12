'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { deleteR2File } from '@/lib/r2-delete'
import { getUniversityForActor } from '@/lib/university-actor'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireUniversity() {
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const role = String(session.user.role ?? '')
    if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') redirect('/login')

    const university = await getUniversityForActor(session.user.id, role)
    if (!university) redirect('/login')
    return university
}

export async function deleteUniversityDocument(
    documentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        if (!documentId || documentId.length > 100) return { ok: false, error: 'Invalid document.' }
        const university = await requireUniversity()

        const doc = await prisma.universityDocument.findFirst({
            where: { id: documentId, universityId: university.id, deletedAt: null },
            select: { id: true, fileUrl: true },
        })
        if (!doc) return { ok: false, error: 'Document not found.' }

        if (doc.fileUrl) await deleteR2File(doc.fileUrl)

        await prisma.universityDocument.update({
            where: { id: documentId },
            data: { deletedAt: new Date() },
        })

        revalidatePath('/university/profile')
        revalidatePath('/university/documents')
        return { ok: true }
    } catch {
        console.error('[deleteUniversityDocument]')
        return { ok: false, error: 'Failed to delete document. Please try again.' }
    }
}

export async function replaceUniversityDocument(
    documentId: string,
    newFileUrl: string,
    newFileName: string,
    newSizeBytes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        if (!documentId || documentId.length > 100) return { ok: false, error: 'Invalid document.' }
        if (!newFileUrl || !newFileName || !Number.isSafeInteger(newSizeBytes) || newSizeBytes <= 0 || newSizeBytes > 10 * 1024 * 1024) {
            return { ok: false, error: 'Invalid replacement file.' }
        }

        const university = await requireUniversity()
        const expectedPrefix = `${(process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')}/uni-docs/${university.id}/`
        if (!process.env.R2_PUBLIC_URL || !newFileUrl.startsWith(expectedPrefix)) {
            return { ok: false, error: 'Invalid replacement file location.' }
        }

        const doc = await prisma.universityDocument.findFirst({
            where: { id: documentId, universityId: university.id, deletedAt: null },
            select: { id: true, fileUrl: true },
        })
        if (!doc) return { ok: false, error: 'Document not found.' }

        const oldFileUrl = doc.fileUrl
        await prisma.universityDocument.update({
            where: { id: documentId },
            data: {
                fileUrl: newFileUrl,
                fileName: newFileName.slice(0, 160),
                sizeBytes: newSizeBytes,
                uploadedAt: new Date(),
            },
        })

        if (oldFileUrl) await deleteR2File(oldFileUrl)

        revalidatePath('/university/profile')
        revalidatePath('/university/documents')
        return { ok: true }
    } catch {
        console.error('[replaceUniversityDocument]')
        return { ok: false, error: 'Failed to replace document. Please try again.' }
    }
}
