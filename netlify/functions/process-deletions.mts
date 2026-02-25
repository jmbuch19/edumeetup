import type { Config } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Netlify Scheduled Function — runs daily at 2:00 AM UTC
 * Finds users whose deletion grace period has elapsed and hard-deletes them.
 * Order per user:
 *   1. Delete R2 files (CV, logo, university documents) — best-effort
 *   2. Write SystemLog (forensic record before FK disappears)
 *   3. Hard-delete User row (cascades all child records via Prisma onDelete: Cascade)
 */
export default async function handler(req: Request): Promise<Response> {
    // Netlify injects the NETLIFY_DEV or scheduled-function context.
    // For extra security we also verify CRON_SECRET so the route can't be
    // triggered anonymously if the function URL ever leaks.
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = req.headers.get('x-cron-secret') ?? req.headers.get('Authorization')
        if (auth !== cronSecret && auth !== `Bearer ${cronSecret}`) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
    }

    const now = new Date()

    const usersToDelete = await prisma.user.findMany({
        where: {
            isActive: false,
            deletionScheduledFor: { lte: now },
            deletionRequestedAt: { not: null },
        },
        select: {
            id: true,
            email: true,
            role: true,
            student: { select: { id: true, cvUrl: true } },
            university: {
                select: {
                    id: true,
                    logo: true,
                    documents: { select: { id: true, fileUrl: true } }
                }
            }
        }
    })

    let deletedCount = 0
    const errors: string[] = []

    for (const user of usersToDelete) {
        try {
            // 1. Collect R2 keys for all files belonging to this user
            const r2Keys: string[] = []

            if (user.student?.cvUrl) {
                r2Keys.push(extractR2Key(user.student.cvUrl))
            }
            if (user.university?.logo) {
                r2Keys.push(extractR2Key(user.university.logo))
            }
            for (const doc of user.university?.documents ?? []) {
                r2Keys.push(extractR2Key(doc.fileUrl))
            }

            // Delete R2 files best-effort — don't abort DB deletion if R2 fails
            if (r2Keys.length > 0) {
                await deleteR2Objects(r2Keys).catch(err =>
                    console.error(`[process-deletions] R2 delete failed for user ${user.id}:`, err)
                )
            }

            // 2. Write forensic system log BEFORE deleting user
            //    SystemLog has no FK to User so it survives the cascade
            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    type: 'ACCOUNT_HARD_DELETE',
                    // NOTE: email stored in metadata only (structured log), not in plain console output
                    message: `Hard-deleted user [REDACTED] (${user.role}) id=${user.id}`,
                    metadata: JSON.stringify({
                        userId: user.id,
                        email: user.email,
                        r2FilesDeleted: r2Keys.length,
                        deletedAt: now.toISOString(),
                    })
                }
            })

            // 3. Hard-delete user — cascades all child records automatically
            await prisma.user.delete({ where: { id: user.id } })

            deletedCount++
            console.log(`[process-deletions] Deleted user id=${user.id} role=${user.role}`)  // email redacted from logs
        } catch (err) {
            console.error(`[process-deletions] Failed to delete user ${user.id}:`, err)
            errors.push(user.id)
        }
    }

    const result = {
        success: true,
        processed: usersToDelete.length,
        deleted: deletedCount,
        ...(errors.length > 0 ? { errors } : {}),
    }

    console.log('[process-deletions] Done:', result)
    return new Response(JSON.stringify(result), { status: 200 })
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export const config: Config = {
    schedule: '0 2 * * *',   // 2:00 AM UTC daily
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractR2Key(url: string): string {
    try {
        return new URL(url).pathname.replace(/^\//, '')
    } catch {
        return url
    }
}

async function deleteR2Objects(keys: string[]): Promise<void> {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKey = process.env.R2_ACCESS_KEY_ID
    const secretKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket = process.env.R2_BUCKET

    if (!accountId || !accessKey || !secretKey || !bucket) {
        console.warn('[process-deletions] R2 env vars not configured — skipping file deletion')
        return
    }

    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    })

    await Promise.all(
        keys.map(key => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })))
    )
}
