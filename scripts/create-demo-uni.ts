import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const existing = await prisma.user.findUnique({ where: { email: 'demo@harvard.edu' } })
    if (existing) {
        console.log('✓ Already exists:', existing.id, '| role:', existing.role)
        return
    }

    const user = await prisma.user.create({
        data: {
            email: 'demo@harvard.edu',
            name: 'Harvard Demo Rep',
            role: 'UNIVERSITY',
            isActive: true,
            emailVerified: new Date(),
            university: {
                create: {
                    institutionName: 'Harvard University (Demo)',
                    country: 'USA',
                    city: 'Cambridge',
                    website: 'https://harvard.edu',
                    repName: 'Demo Rep',
                    repEmail: 'demo@harvard.edu',
                    contactEmail: 'demo@harvard.edu',
                    verificationStatus: 'VERIFIED',
                    verifiedAt: new Date(),
                }
            }
        },
        include: { university: true }
    })

    const u = user as any
    console.log('✓ Created university user:', user.email)
    console.log('✓ University:', u.university?.institutionName)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
