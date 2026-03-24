import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: any
}

/**
 * Append Neon-specific connection pool params to the DATABASE_URL.
 * - connection_timeout: seconds to wait for a connection before giving up (default: 5)
 * - pool_timeout: seconds to wait for a slot in the pool (default: 10)
 * - connect_timeout: TCP-level connection timeout in seconds
 *
 * These prevent a slow or cold Neon instance from leaving serverless
 * functions hanging indefinitely, which exhausts connection limits.
 */
function buildDatasourceUrl(): string | undefined {
    const url = process.env.DATABASE_URL
    if (!url) return undefined
    try {
        const parsed = new URL(url)

        // CRITICAL: Neon serverless pooling safety
        // Prevents Prisma from ignoring the PgBouncer transaction mode during traffic spikes,
        // which violently crashes the DB and exhausts connections by forcing prepared statements.
        if (parsed.hostname.includes('pooler') && !parsed.searchParams.has('pgbouncer')) {
            parsed.searchParams.set('pgbouncer', 'true')
        }

        if (!parsed.searchParams.has('connection_timeout')) {
            parsed.searchParams.set('connection_timeout', '10')
        }
        if (!parsed.searchParams.has('pool_timeout')) {
            parsed.searchParams.set('pool_timeout', '10')
        }
        if (!parsed.searchParams.has('connect_timeout')) {
            parsed.searchParams.set('connect_timeout', '10')
        }
        return parsed.toString()
    } catch {
        // If the URL isn't parseable, fall back to it as-is
        return url
    }
}

const prismaClientSingleton = () => {
    const client = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasourceUrl: buildDatasourceUrl(),
    })
    
    return client.$extends({
        query: {
            $allModels: {
                async findMany({ args, query }) {
                    // Global memory protection: cap unbounded queries.
                    // Prevents fetching massive datasets at once. If 'take' is set manually, it overrides this.
                    if (args.take === undefined) {
                        args.take = 1000
                    }
                    return query(args)
                }
            }
        }
    })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

