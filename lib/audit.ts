import { prisma } from "@/lib/prisma"

export async function logAudit({
    action,
    entityType,
    entityId,
    actorId,
    metadata
}: {
    action: string
    entityType: string
    entityId: string
    actorId: string
    metadata?: Record<string, unknown>
}) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                actorId,
                metadata: metadata ? JSON.stringify(metadata) : undefined
            }
        })
    } catch (error) {
        console.error("Failed to write audit log:", error)
        // Fail silently to not block the main action
    }
}
