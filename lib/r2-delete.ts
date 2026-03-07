import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"

// Module-level singleton — created once, reused for every deleteR2File call
let _client: S3Client | null = null

function getR2Client(): S3Client {
    if (_client) return _client

    const accountId = process.env.R2_ACCOUNT_ID
    const accessKey = process.env.R2_ACCESS_KEY_ID
    const secretKey = process.env.R2_SECRET_ACCESS_KEY

    if (!accountId || !accessKey || !secretKey) {
        throw new Error('[R2 Delete] Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY')
    }

    _client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    })
    return _client
}

export async function deleteR2File(fileUrl: string): Promise<void> {
    try {
        const url = new URL(fileUrl)
        const key = url.pathname.slice(1)

        await getR2Client().send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: key,
        }))
    } catch (error) {
        // Log but don't throw — DB record deletion should still proceed
        // even if R2 delete fails (avoids orphaned DB records)
        console.error("[R2 Delete Error]", error)
    }
}
