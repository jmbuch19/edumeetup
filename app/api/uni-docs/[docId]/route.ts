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

    // All authenticated roles can download
    const doc = await prisma.universityDocument.findUnique({
        where: { id: docId },
        select: { data: true, fileName: true, displayName: true, mimeType: true },
    })

    if (!doc?.data) {
        return new NextResponse('Document not found', { status: 404 })
    }

    const isImage = doc.mimeType.startsWith('image/')
    // Images: inline display. PDFs: inline display (browser handles both)
    // Always include content-disposition for download fallback
    return new NextResponse(new Uint8Array(doc.data), {
        status: 200,
        headers: {
            'Content-Type': doc.mimeType,
            'Content-Disposition': `inline; filename="${doc.fileName}"`,
            'Cache-Control': 'private, no-store',
        },
    })
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { docId: string } }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'UNIVERSITY') {
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

    await prisma.universityDocument.delete({ where: { id: docId } })
    return NextResponse.json({ success: true })
}
