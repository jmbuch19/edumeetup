
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const universities = [
        { name: 'Test University A', email: 'unia@test.com', country: 'USA' },
        { name: 'Test University B', email: 'unib@test.com', country: 'UK' }
    ]

    for (const u of universities) {
        try {
            let user = await prisma.user.findFirst({ where: { email: u.email } })
            if (!user) {
                user = await prisma.user.create({
                    data: { email: u.email, name: u.name, role: 'UNIVERSITY', isActive: true }
                })
            }
            const uni = await prisma.university.findFirst({ where: { userId: user.id } })
            if (!uni) {
                await prisma.university.create({
                    data: { userId: user.id, institutionName: u.name, country: u.country, contactEmail: u.email, isVerified: true }
                })
            }
        } catch (e) {
            console.error("Error creating " + u.name, e)
        }
    }
}

main()
