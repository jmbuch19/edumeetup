import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB hard limit

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only students can upload their own CV
    if (session.user.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Only students can upload a CV' }, { status: 403 })
    }

    const student = await prisma.student.findFirst({ where: { userId: session.user.id } })
    if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    let formData: FormData
    try {
        formData = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('cv') as File | null
    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate MIME type
    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 422 })
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(1)
        return NextResponse.json(
            { error: `File is too large (${mb} MB). Maximum allowed is 5 MB.` },
            { status: 422 }
        )
    }

    // Read bytes
    const arrayBuffer = await file.arrayBuffer()
    const bytes = Buffer.from(arrayBuffer)

    // Sanitize filename
    const originalName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
    const fileName = originalName.endsWith('.pdf') ? originalName : `${originalName}.pdf`

    await prisma.student.update({
        where: { id: student.id },
        data: {
            cvData: bytes,
            cvFileName: fileName,
            cvUploadedAt: new Date(),
            cvSizeBytes: file.size,
        },
    })

    return NextResponse.json({
        success: true,
        fileName,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
    })
}

export async function DELETE(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.student.findFirst({ where: { userId: session.user.id } })
    if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    await prisma.student.update({
        where: { id: student.id },
        data: { cvData: null, cvFileName: null, cvUploadedAt: null, cvSizeBytes: null },
    })

    return NextResponse.json({ success: true })
}
