import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDataIntegrity() {
    console.log('Verifying data integrity (Record Counts)...')
    try {
        const studentCount = await prisma.student.count()
        const universityCount = await prisma.university.count()
        const interestCount = await prisma.interest.count()

        console.log('--- RECORD COUNTS ---')
        console.log(`Students:     ${studentCount}`)
        console.log(`Universities: ${universityCount}`)
        console.log(`Interests:    ${interestCount}`)
        console.log('---------------------')

        if (studentCount > 0 || universityCount > 0) {
            console.log('✅ Data detected. Tables are not empty.')
        } else {
            console.log('⚠️ Warning: Tables appear empty. This might be expected if the DB was fresh, but check if data was lost.')
        }

    } catch (error) {
        console.error('❌ Verification failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

verifyDataIntegrity()
