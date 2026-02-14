
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const uni = await prisma.universityProfile.findFirst()
    if (!uni) {
        console.log("No university found")
        return
    }

    await prisma.universityProfile.update({
        where: { id: uni.id },
        data: { verificationStatus: 'VERIFIED' }
    })

    console.log(`University ${uni.institutionName} verified.`)
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
