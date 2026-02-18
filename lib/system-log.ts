import { prisma } from "@/lib/prisma"

export type LogLevel = 'INFO' | 'WARN' | 'ERROR'
export type LogType = 'EMAIL_FAILURE' | 'APP_CRASH' | 'AUTH_FAILURE' | 'SYSTEM_EVENT'

export async function logSystemEvent({
    level,
    type,
    message,
    metadata
}: {
    level: LogLevel
    type: LogType
    message: string
    metadata?: Record<string, unknown>
}) {
    try {
        await prisma.systemLog.create({
            data: {
                level,
                type,
                message,
                metadata: metadata ? JSON.stringify(metadata) : undefined
            }
        })
    } catch (error) {
        console.error("Failed to write system log:", error)
        // Fail silently to avoid infinite loops if DB is down
    }
}
