
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Checking for test universities...')

    const universities = [
        {
            name: 'Test University A',
            email: 'unia@test.com',
            country: 'USA'
        },
        {
            name: 'Test University B',
            email: 'unib@test.com',
            country: 'UK'
        }
    ]

    for (const u of universities) {
        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email: u.email }
        })

        if (!user) {
            console.log(`Creating user for ${u.name}...`)
            user = await prisma.user.create({
                data: {
                    email: u.email,
                    name: u.name,
                    role: 'UNIVERSITY',
                    isActive: true
                }
            })
        }

        // Check if university profile exists
        const uniProfile = await prisma.university.findUnique({
            where: { userId: user.id }
        })

        if (!uniProfile) {
            console.log(`Creating profile for ${u.name}...`)
            await prisma.university.create({
                data: {
                    userId: user.id,
                    institutionName: u.name,
                    country: u.country,
                    contactEmail: u.email,
                    isVerified: true
                }
            })
        } else {
            console.log(`Profile for ${u.name} already exists.`)
        }
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
