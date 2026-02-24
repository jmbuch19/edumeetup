
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLogs() {
    console.log('Checking recent System Logs...')
    try {
        const logs = await prisma.systemLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
        })

        console.log('--- RECENT LOGS ---')
        console.log(logs)
        console.log('-------------------')

        const users = await prisma.user.findMany({
            take: 5,
            select: { email: true, isActive: true, role: true }
        })
        console.log('--- USERS CHECK ---')
        console.log(users)

    } catch (error) {
        console.error('❌ Check failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkLogs()
