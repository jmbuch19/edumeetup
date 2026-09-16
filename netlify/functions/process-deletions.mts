import type { Config } from '@netlify/functions'
import { prisma } from '../../lib/prisma'

/**
 * Netlify Scheduled Function — runs daily at 2:00 AM UTC.
 * Native Scheduled Functions are invoked by Netlify's scheduler and do not
 * receive arbitrary custom authentication headers. HTTP cron routes use
 * CRON_SECRET separately.
 */
export default async function handler(): Promise<Response> {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const recentRun = await prisma.systemLog.findFirst({
        where: { type: 'PROCESS_DELETIONS_CRON', createdAt: { gte: twoHoursAgo } }
    })
    if (recentRun) {
        return new Response(JSON.stringify({ message: 'Already ran recently' }), { status: 200 })
    }

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
            const r2Keys: string[] = []
            if (user.student?.cvUrl) r2Keys.push(extractR2Key(user.student.cvUrl))
            if (user.university?.logo) r2Keys.push(extractR2Key(user.university.logo))
            for (const doc of user.university?.documents ?? []) {
                r2Keys.push(extractR2Key(doc.fileUrl))
            }

            if (r2Keys.length > 0) {
                await deleteR2Objects(r2Keys).catch(err =>
                    console.error(`[process-deletions] R2 delete failed for user ${user.id}:`, err)
                )
            }

            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    type: 'ACCOUNT_HARD_DELETE',
                    message: `Hard-deleted user [REDACTED] (${user.role}) id=${user.id}`,
                    metadata: JSON.stringify({
                        userId: user.id,
                        email: user.email,
                        r2FilesDeleted: r2Keys.length,
                        deletedAt: now.toISOString(),
                    })
                }
            })

            await prisma.user.delete({ where: { id: user.id } })
            deletedCount++
            console.log(`[process-deletions] Deleted user id=${user.id} role=${user.role}`)
        } catch (err) {
            console.error(`[process-deletions] Failed to delete user ${user.id}:`, err)
            errors.push(user.id)
        }
    }

    let walkInsDeleted = 0
    try {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        const { count } = await prisma.fairStudentPass.deleteMany({
            where: { studentId: null, createdAt: { lte: ninetyDaysAgo } },
        })
        walkInsDeleted = count
        if (count > 0) {
            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    type: 'WALKIN_PII_PURGE',
                    message: `Purged ${count} walk-in pass records older than 90 days`,
                    metadata: JSON.stringify({ count, cutoffDate: ninetyDaysAgo.toISOString() }),
                },
            })
        }
    } catch (err) {
        console.error('[process-deletions] Walk-in PII purge failed:', err)
    }

    const result = {
        success: true,
        processed: usersToDelete.length,
        deleted: deletedCount,
        walkInsPurged: walkInsDeleted,
        ...(errors.length > 0 ? { errors } : {}),
    }

    await prisma.systemLog.create({
        data: {
            level: 'INFO',
            type: 'PROCESS_DELETIONS_CRON',
            message: 'Process deletions cron run complete',
            metadata: JSON.stringify(result)
        }
    })

    console.log('[process-deletions] Done:', result)
    return new Response(JSON.stringify(result), { status: 200 })
}

export const config: Config = { schedule: '0 2 * * *' }

function extractR2Key(url: string): string {
    try { return new URL(url).pathname.replace(/^\//, '') } catch { return url }
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
    await Promise.all(keys.map(key => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))))
}
