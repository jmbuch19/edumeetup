import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: { docId: string } }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const { docId } = params

    // All authenticated roles can download university documents
    const doc = await prisma.universityDocument.findUnique({
        where: { id: docId },
        select: { fileUrl: true, fileName: true, displayName: true, mimeType: true },
    })

    if (!doc?.fileUrl) {
        return new NextResponse('Document not found', { status: 404 })
    }

    // Redirect to the R2 URL — no binary served from DB
    return NextResponse.redirect(doc.fileUrl)
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { docId: string } }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as string
    if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') {
        return NextResponse.json({ error: 'Only universities can delete their documents' }, { status: 403 })
    }

    const { docId } = params

    // Verify this doc belongs to the authenticated university
    const university = await prisma.university.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!university) return NextResponse.json({ error: 'University not found' }, { status: 404 })

    const doc = await prisma.universityDocument.findUnique({
        where: { id: docId },
        select: { universityId: true },
    })

    if (!doc || doc.universityId !== university.id) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // TODO: also delete the object from R2 using the fileUrl key
    await prisma.universityDocument.delete({ where: { id: docId } })
    return NextResponse.json({ success: true })
}
