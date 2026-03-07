import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const uniUsers = await prisma.user.findMany({
    where: { role: { in: ['UNIVERSITY', 'UNIVERSITY_REP'] } },
    select: {
        id: true,
        email: true,
        role: true,
        universityId: true,
        university: { select: { id: true, institutionName: true, verificationStatus: true } },
    },
})

console.log('University users:')
for (const u of uniUsers) {
    console.log(`  email: ${u.email}`)
    console.log(`  role : ${u.role}`)
    console.log(`  uniId: ${u.universityId ?? '(no universityId on User)'}`)
    if (u.university) console.log(`  uni  : ${u.university.institutionName} [${u.university.id}]`)
    console.log()
}

await prisma.$disconnect()
