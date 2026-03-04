import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Check existing universities
const unis = await prisma.university.findMany({
    select: { id: true, institutionName: true, verificationStatus: true, userId: true },
    take: 5,
})

console.log('Universities in DB:')
if (unis.length === 0) console.log('  (none)')
for (const u of unis) {
    console.log(`  id: ${u.id}  name: ${u.institutionName}  status: ${u.verificationStatus}  userId: ${u.userId}`)
}

await prisma.$disconnect()
