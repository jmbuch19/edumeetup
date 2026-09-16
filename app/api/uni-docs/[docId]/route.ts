import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteR2File } from '@/lib/r2-delete'
import { getUniversityForActor } from '@/lib/university-actor'

export async function GET(_req: NextRequest, props: { params: Promise<{ docId: string }> }) {
    const { docId } = await props.params
    const session = await auth()
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })
    if (!docId || docId.length > 100) return new NextResponse('Document not found', { status: 404 })

    const doc = await prisma.universityDocument.findFirst({
        where: { id: docId, deletedAt: null },
        select: { fileUrl: true },
    })
    if (!doc?.fileUrl) return new NextResponse('Document not found', { status: 404 })

    return NextResponse.redirect(doc.fileUrl, {
        headers: { 'Cache-Control': 'private, no-store' },
    })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ docId: string }> }) {
    const { docId } = await props.params
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = String(session.user.role ?? '')
    if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') {
        return NextResponse.json({ error: 'Only universities can delete their documents' }, { status: 403 })
    }
    if (!docId || docId.length > 100) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const university = await getUniversityForActor(session.user.id, role)
    if (!university) return NextResponse.json({ error: 'University not found' }, { status: 404 })

    const doc = await prisma.universityDocument.findFirst({
        where: { id: docId, universityId: university.id, deletedAt: null },
        select: { fileUrl: true },
    })
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    if (doc.fileUrl) await deleteR2File(doc.fileUrl)
    await prisma.universityDocument.update({
        where: { id: docId },
        data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
}
