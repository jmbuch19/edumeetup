import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']

async function uploadToR2(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKey = process.env.R2_ACCESS_KEY_ID
    const secretKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket = process.env.R2_BUCKET
    const publicUrl = process.env.R2_PUBLIC_URL

    if (!accountId || !accessKey || !secretKey || !bucket || !publicUrl) {
        throw new Error('R2 environment variables are not configured')
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
        // Logos are public — no cache-control issues
        CacheControl: 'public, max-age=31536000, immutable',
    }))

    return `${publicUrl}/${key}`
}

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP' && role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let formData: FormData
    try {
        formData = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Unsupported image type. Upload a PNG, JPG, SVG, or WebP.' }, { status: 422 })
    }

    if (file.size > MAX_SIZE_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(1)
        return NextResponse.json({ error: `Image is too large (${mb} MB). Max 2 MB.` }, { status: 422 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const r2Key = `logos/${session.user.id}/${Date.now()}.${ext}`

    let url: string
    try {
        url = await uploadToR2(buffer, r2Key, file.type)
    } catch (err) {
        console.error('[Logo Upload] R2 upload failed:', err)
        return NextResponse.json({ error: 'Upload failed. Check R2 config.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url })
}
