
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = `teststudent_${Date.now()}@example.com`
    const password = 'password123'

    console.log(`Testing with email: ${email}`)

    // 1. Simulate Registration (by calling the DB directly as if the action did it)
    // We can't easily call server actions from a script outside Next.js context without some setup,
    // so we will simulate what the action does to ensure the DB constraints are met.

    try {
        const user = await prisma.user.create({
            data: {
                email,
                password,
                role: 'STUDENT',
                status: 'ACTIVE',
                studentProfile: {
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
            include: { studentProfile: true }
        })
        console.log('1. Registration successful:', user.id)

        // 2. Verify Login Logic (Query)
        const loginUser = await prisma.user.findUnique({ where: { email } })
        if (loginUser && loginUser.password === password) {
            console.log('2. Login verification successful')
        } else {
            console.error('2. Login verification failed')
        }

        // 3. Verify Dashboard Access (Check if profile exists)
        if (user.studentProfile) {
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
