'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { deleteR2File } from '@/lib/r2-delete'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireUniversity() {
    const session = await auth()
    if (!session?.user) redirect('/login')
    const role = (session.user as any).role
    if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') redirect('/login')
    const uni = await prisma.university.findUnique({ where: { userId: session.user.id! } })
    if (!uni) redirect('/login')
    return uni
}

export async function deleteUniversityDocument(
    documentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        // Auth guard — derive universityId from session, never from caller
        const uni = await requireUniversity()

        // 1. Fetch document — verify it belongs to this university and isn't already deleted
        const doc = await prisma.universityDocument.findFirst({
            where: { id: documentId, universityId: uni.id, deletedAt: null },
            select: { id: true, fileUrl: true },
        })

        if (!doc) {
            return { ok: false, error: 'Document not found.' }
        }

        // 2. Delete from R2 (non-fatal — DB soft delete always proceeds)
        if (doc.fileUrl) {
            await deleteR2File(doc.fileUrl)
        }

        // 3. Soft delete in DB
        await prisma.universityDocument.update({
            where: { id: documentId },
            data: { deletedAt: new Date() },
        })

        // 4. Revalidate both pages that list documents
        revalidatePath('/university/profile')
        revalidatePath('/university/documents')

        return { ok: true }
    } catch (err) {
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
        // Auth guard — derive universityId from session
        const uni = await requireUniversity()

        // 1. Fetch existing document — verify ownership, capture old fileUrl
        const doc = await prisma.universityDocument.findFirst({
            where: { id: documentId, universityId: uni.id, deletedAt: null },
            select: { id: true, fileUrl: true },
        })

        if (!doc) {
            return { ok: false, error: 'Document not found.' }
        }

        const oldFileUrl = doc.fileUrl

        // 2. Update the same record in-place with new file fields
        await prisma.universityDocument.update({
            where: { id: documentId },
            data: {
                fileUrl: newFileUrl,
                fileName: newFileName,
                sizeBytes: newSizeBytes,
                uploadedAt: new Date(),
            },
        })

        // 3. Delete old R2 object (non-fatal — DB update already committed)
        if (oldFileUrl) {
            await deleteR2File(oldFileUrl)
        }

        // 4. Revalidate
        revalidatePath('/university/profile')
        revalidatePath('/university/documents')

        return { ok: true }
    } catch (err) {
        console.error('[replaceUniversityDocument]')
        return { ok: false, error: 'Failed to replace document. Please try again.' }
    }
}

