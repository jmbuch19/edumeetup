import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cron/process-deletions
 * Runs daily (2am UTC via Vercel Cron).
 * Finds users where deletionScheduledFor <= now and hard-deletes them.
 * Order: R2 files → DB records (cascade) → User → final AuditLog
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
            // 1. Delete R2 files (best-effort — don't block DB deletion if R2 fails)
            const r2Keys: string[] = []

            if (user.student?.cvUrl) {
                r2Keys.push(extractR2Key(user.student.cvUrl))
            }
            if (user.university?.logo) {
                r2Keys.push(extractR2Key(user.university.logo))
            }
            if (user.university?.documents) {
                for (const doc of user.university.documents) {
                    r2Keys.push(extractR2Key(doc.fileUrl))
                }
            }

            if (r2Keys.length > 0) {
                await deleteR2Objects(r2Keys).catch(err =>
                    console.error(`[process-deletions] R2 delete failed for user ${user.id}:`, err)
                )
            }

            // 2. Write final audit log BEFORE deleting user
            //    (AuditLog.actorId FK — we use SYSTEM sentinel since user won't exist after)
            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    type: 'ACCOUNT_HARD_DELETE',
                    message: `Hard-deleted user ${user.email} (${user.role})`,
                    metadata: {
                        userId: user.id,
                        email: user.email,
                        r2FilesDeleted: r2Keys.length,
                        deletedAt: now.toISOString(),
                    }
                }
            })

            // 3. Hard-delete user — all related records cascade via Prisma onDelete: Cascade
            await prisma.user.delete({ where: { id: user.id } })

            deletedCount++
        } catch (err) {
            console.error(`[process-deletions] Failed to delete user ${user.id}:`, err)
            errors.push(user.id)
        }
    }

    return NextResponse.json({
        success: true,
        processed: usersToDelete.length,
        deleted: deletedCount,
        errors: errors.length > 0 ? errors : undefined,
    })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractR2Key(url: string): string {
    try {
        const parsed = new URL(url)
        return parsed.pathname.replace(/^\//, '')
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
        console.warn('[process-deletions] R2 not configured — skipping file deletion')
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
