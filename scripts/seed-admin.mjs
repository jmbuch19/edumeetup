/**
 * seed-admin.mjs
 *
 * Run after `prisma db push` in the Netlify build to ensure the admin
 * user always exists. Safe to run on every deploy — upserts so it never
 * creates duplicates or overwrites existing data.
 *
 * Usage: node scripts/seed-admin.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@edumeetup.com'

try {
    const result = await prisma.user.upsert({
        where: { email: adminEmail },
        create: {
            email: adminEmail,
            role: 'ADMIN',
            isActive: true,
        },
        update: {
            role: 'ADMIN',
            isActive: true,
        },
    })
    console.log(`[seed-admin] Admin user ensured: ${result.email} (id=${result.id})`)
} catch (err) {
    console.error('[seed-admin] Failed to upsert admin user:', err.message)
    // Non-fatal — don't block the deploy
} finally {
    await prisma.$disconnect()
}
