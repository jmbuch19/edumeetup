import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

let _client: S3Client | null = null

export function getR2Client(): S3Client {
    if (_client) return _client

    const accountId = process.env.R2_ACCOUNT_ID
    const accessKey = process.env.R2_ACCESS_KEY_ID
    const secretKey = process.env.R2_SECRET_ACCESS_KEY

    if (!accountId || !accessKey || !secretKey) {
        throw new Error('[R2] Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY')
    }

    _client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    })
    return _client
}

export async function getSignedUploadUrl({ 
    key, 
    contentType, 
    expiresIn = 3600 
}: { 
    key: string; 
    contentType: string; 
    expiresIn?: number 
}) {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        ContentType: contentType,
    })

    return getSignedUrl(getR2Client(), command, { expiresIn })
}

export async function getSignedDownloadUrl({ 
    key, 
    expiresIn = 3600 
}: { 
    key: string; 
    expiresIn?: number 
}) {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
    })

    return getSignedUrl(getR2Client(), command, { expiresIn })
}
