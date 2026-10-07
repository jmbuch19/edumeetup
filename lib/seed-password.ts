/**
 * seed-password.ts
 *
 * Resolves passwords for local/demo seed accounts without hard-coding them.
 * Uses the given environment variable when set; otherwise generates a strong
 * random password (the seed script prints it once so the developer can use it).
 */

import { randomBytes } from 'crypto'

export const MIN_SEED_PASSWORD_LENGTH = 12

export interface SeedPassword {
    password: string
    generated: boolean
}

export function resolveSeedPassword(
    envVar: string,
    env: Record<string, string | undefined> = process.env,
): SeedPassword {
    const fromEnv = env[envVar]?.trim()
    if (fromEnv) {
        if (fromEnv.length < MIN_SEED_PASSWORD_LENGTH) {
            throw new Error(`${envVar} must be at least ${MIN_SEED_PASSWORD_LENGTH} characters long`)
        }
        return { password: fromEnv, generated: false }
    }
    return { password: randomBytes(18).toString('base64url'), generated: true }
}

/**
 * Seeding creates ADMIN users and demo listings, so refuse to run against
 * production unless explicitly overridden.
 */
export function assertSeedAllowed(env: Record<string, string | undefined> = process.env): void {
    if (env.NODE_ENV === 'production' && env.ALLOW_PRODUCTION_SEED !== 'true') {
        throw new Error(
            'Refusing to seed with NODE_ENV=production (this creates admin and demo accounts). ' +
            'Set ALLOW_PRODUCTION_SEED=true to override.'
        )
    }
}
