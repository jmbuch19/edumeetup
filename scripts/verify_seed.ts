
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const unis = await prisma.university.findMany({
        include: { programs: true }
    })

    console.log(`Total Universities: ${unis.length}`)

    const oneProgram = unis.filter(u => u.programs.length === 1)
    console.log(`Unis with 1 program: ${oneProgram.length} (Expected 5)`)

    const sixPrograms = unis.filter(u => u.programs.length === 6)
    console.log(`Unis with 6 programs: ${sixPrograms.length} (Expected 5)`)

    const missingOptional = unis.filter(u => u.website === '' || u.website === null)
    console.log(`Unis missing website: ${missingOptional.length} (Expected 3)`)

    let highTuitionCount = 0
    let lowTuitionCount = 0
    let noEnglishCount = 0

    unis.forEach(u => {
        u.programs.forEach(p => {
            if ((p.tuitionFee ?? 0) > 150000) highTuitionCount++
            if ((p.tuitionFee ?? 0) < 1000) lowTuitionCount++
            if (!p.englishTests || p.englishTests === '') noEnglishCount++
        })
    })

    console.log(`High Tuition Programs (>150k): ${highTuitionCount} (Expected 1)`)
    console.log(`Low Tuition Programs (<1k): ${lowTuitionCount} (Expected 1)`)
    console.log(`No English Requirement Programs: ${noEnglishCount} (Expected > 0)`) // 2 unis * ~3 programs

    // Sample data
    console.log("Sample University:", JSON.stringify(unis[unis.length - 1], null, 2))
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
