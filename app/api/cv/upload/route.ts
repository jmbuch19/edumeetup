import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteR2File } from '@/lib/r2-delete'
import { validateFileSignature } from '@/lib/file-signature'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB hard limit

// ---------------------------------------------------------------------------
// NOTE: CV files are stored in Cloudflare R2, NOT in the database.
// This route accepts the upload, pushes it to R2, then saves the public URL.
//
// To enable R2 uploads, set these env vars:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
// ---------------------------------------------------------------------------

async function uploadToR2(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKey = process.env.R2_ACCESS_KEY_ID
    const secretKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket = process.env.R2_BUCKET
    const publicUrl = process.env.R2_PUBLIC_URL

    if (!accountId || !accessKey || !secretKey || !bucket || !publicUrl) {
        throw new Error('R2 environment variables are not configured')
    }

    // Use the AWS SDK S3 client (compatible with R2)
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    })

    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
    }))

    return `${publicUrl}/${key}`
}

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 422 })
    }

    if (file.size > MAX_SIZE_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(1)
        return NextResponse.json(
            { error: `File is too large (${mb} MB). Maximum allowed is 5 MB.` },
            { status: 422 }
        )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Magic byte validation — file.type is client-declared and trivially spoofed.
    // Check the actual bytes to confirm this is a real PDF.
    if (!validateFileSignature(buffer, 'application/pdf')) {
        return NextResponse.json(
            { error: 'File content does not match a valid PDF. Upload a genuine PDF file.' },
            { status: 422 }
        )
    }

    const originalName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
    const fileName = originalName.endsWith('.pdf') ? originalName : `${originalName}.pdf`
    const r2Key = `cvs/${student.id}/${Date.now()}_${fileName}`

    let cvUrl: string
    try {
        cvUrl = await uploadToR2(buffer, r2Key, 'application/pdf')
    } catch (err) {
        console.error('[CV Upload] R2 upload failed:')
        return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 })
    }

    // Replace flow: delete old R2 object if one existed (non-fatal)
    if (student.cvUrl) {
        await deleteR2File(student.cvUrl)
    }

    await prisma.student.update({
        where: { id: student.id },
        data: {
            cvUrl,
            cvFileName: fileName,
            cvUploadedAt: new Date(),
            cvSizeBytes: file.size,
        },
    })

    return NextResponse.json({ success: true, fileName, sizeBytes: file.size, uploadedAt: new Date().toISOString() })
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

    // Delete old R2 object if present, then clear DB fields
    if (student.cvUrl) {
        await deleteR2File(student.cvUrl)
    }

    await prisma.student.update({
        where: { id: student.id },
        data: { cvUrl: null, cvFileName: null, cvUploadedAt: null, cvSizeBytes: null },
    })

    return NextResponse.json({ success: true })
}
