import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const VALID_CATEGORIES = ['BROCHURE', 'PROGRAM_INFO', 'LEAFLET', 'OTHER']

async function uploadToR2(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKey = process.env.R2_ACCESS_KEY_ID
    const secretKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket = process.env.R2_BUCKET
    const publicUrl = process.env.R2_PUBLIC_URL

    if (!accountId || !accessKey || !secretKey || !bucket || !publicUrl) {
        throw new Error('R2 environment variables not configured')
    }

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
    if ((session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
        return NextResponse.json({ error: 'Only universities can upload documents' }, { status: 403 })
    }

    const university = await prisma.university.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!university) {
        return NextResponse.json({ error: 'University profile not found' }, { status: 404 })
    }

    let formData: FormData
    try {
        formData = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    const displayName = (formData.get('displayName') as string | null)?.trim()
    const category = (formData.get('category') as string | null) ?? 'OTHER'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!displayName) return NextResponse.json({ error: 'Document name is required' }, { status: 400 })
    if (!VALID_CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 422 })
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Only PDF or image files (JPG/PNG/WebP) are accepted' }, { status: 422 })
    }
    if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.` }, { status: 422 })
    }

    // Limit per university (prevent abuse)
    const count = await prisma.universityDocument.count({ where: { universityId: university.id } })
    if (count >= 20) {
        return NextResponse.json({ error: 'Maximum 20 documents allowed. Please delete some first.' }, { status: 429 })
    }

    const fileName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
    const r2Key = `uni-docs/${university.id}/${Date.now()}_${fileName}`

    let fileUrl: string
    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        fileUrl = await uploadToR2(buffer, r2Key, file.type)
    } catch (err) {
        console.error('R2 upload failed:', err)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const doc = await prisma.universityDocument.create({
        data: {
            universityId: university.id,
            displayName,
            category,
            fileName,
            fileUrl,
            mimeType: file.type,
            sizeBytes: file.size,
        },
    })

    return NextResponse.json({
        success: true,
        id: doc.id,
        displayName: doc.displayName,
        category: doc.category,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        uploadedAt: doc.uploadedAt,
    })
}
