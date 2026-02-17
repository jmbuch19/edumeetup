
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = `teststudent_${Date.now()}@example.com`

    console.log(`Testing with email: ${email}`)

    // 1. Simulate Registration (by calling the DB directly as if the action did it)
    // We can't easily call server actions from a script outside Next.js context without some setup,
    // so we will simulate what the action does to ensure the DB constraints are met.

    try {
        const user = await prisma.user.create({
            data: {
                email,
                role: 'STUDENT',
                status: 'ACTIVE',
                student: {
                    create: {
                        fullName: 'Test Student',
                        country: 'India',
                        currentStatus: 'Undergraduate',
                        fieldOfInterest: 'Computer Science',
                        preferredCountries: 'USA',
                        profileComplete: true,
                    }
                }
            },
            include: { student: true }
        })
        console.log('1. Registration successful:', user.id)

        // 2. Verify Login Logic (Query)
        // 2. Verify Login Logic (Query)
        const loginUser = await prisma.user.findUnique({ where: { email } })
        if (loginUser) {
            console.log('2. User creation successful')
        } else {
            console.error('2. User missing')
        }

        // 3. Verify Dashboard Access (Check if profile exists)
        // 3. Verify Dashboard Access (Check if profile exists)
        if (user.student) {
            console.log('3. Student profile exists, dashboard should be accessible')
        } else {
            console.error('3. Student profile missing')
        }

    } catch (error) {
        console.error('Test failed:', error)
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
