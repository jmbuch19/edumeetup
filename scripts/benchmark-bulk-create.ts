import { PrismaClient, FieldCategory } from '@prisma/client'

const prisma = new PrismaClient()

// Copy of mapFieldCategory from app/actions/bulk-program-actions.ts
function mapFieldCategory(input: string): FieldCategory {
    if (!input) return FieldCategory.Others
    const lower = input.toLowerCase()
    if (lower.includes("comput") || lower.includes("soft") || lower.includes("it")) return FieldCategory.Computer_Science
    if (lower.includes("engin")) return FieldCategory.Engineering
    if (lower.includes("busin") || lower.includes("mba") || lower.includes("manag")) return FieldCategory.Business
    if (lower.includes("data") || lower.includes("ai") || lower.includes("intell")) return FieldCategory.Data_Science
    if (lower.includes("health") || lower.includes("med")) return FieldCategory.Health_Sciences
    if (lower.includes("soci")) return FieldCategory.Social_Sciences
    if (lower.includes("art") || lower.includes("hum")) return FieldCategory.Arts_Humanities
    if (lower.includes("law")) return FieldCategory.Law
    if (lower.includes("arch")) return FieldCategory.Architecture
    return FieldCategory.Others
}

async function main() {
    // 1. Setup: Create User and UniversityProfile
    const email = `benchmark-${Date.now()}@test.com`
    const user = await prisma.user.create({
        data: {
            email,
            password: 'password',
            role: 'UNIVERSITY',
        }
    })

    const uniProfile = await prisma.universityProfile.create({
        data: {
            userId: user.id,
            institutionName: 'Benchmark University',
            country: 'TestLand',
        }
    })

    console.log(`Created test university: ${uniProfile.id}`)

    // 2. Generate Data
    const dataSize = 100
    const data = Array.from({ length: dataSize }, (_, i) => ({
        programName: `Program ${i}`,
        degreeLevel: "Bachelor's",
        fieldCategory: 'Computer Science', // Will be mapped
        tuitionFee: 10000 + i,
        durationMonths: 48,
        intakes: 'Fall 2024'
    }))

    // 3. Benchmark Original (N+1)
    console.log(`Starting benchmark for N+1 inserts with ${dataSize} items...`)
    const startOriginal = performance.now()

    for (const item of data) {
        await prisma.program.create({
            data: {
                universityId: uniProfile.id,
                programName: item.programName,
                degreeLevel: item.degreeLevel,
                fieldCategory: mapFieldCategory(item.fieldCategory),
                tuitionFee: item.tuitionFee,
                durationMonths: item.durationMonths,
                intakes: item.intakes,
                stemDesignated: false,
                currency: 'USD',
                englishTests: null
            }
        })
    }

    const endOriginal = performance.now()
    const timeOriginal = endOriginal - startOriginal
    console.log(`Original (N+1) took: ${timeOriginal.toFixed(2)} ms`)

    // Clean up programs
    await prisma.program.deleteMany({ where: { universityId: uniProfile.id } })


    // 4. Benchmark Optimized (createMany)
    console.log(`Starting benchmark for createMany with ${dataSize} items...`)
    const startOptimized = performance.now()

    const mappedData = data.map(item => ({
        universityId: uniProfile.id,
        programName: item.programName,
        degreeLevel: item.degreeLevel,
        fieldCategory: mapFieldCategory(item.fieldCategory),
        tuitionFee: item.tuitionFee,
        durationMonths: item.durationMonths,
        intakes: item.intakes,
        stemDesignated: false,
        currency: 'USD',
        englishTests: null
    }))

    await prisma.program.createMany({
        data: mappedData
    })

    const endOptimized = performance.now()
    const timeOptimized = endOptimized - startOptimized
    console.log(`Optimized (createMany) took: ${timeOptimized.toFixed(2)} ms`)

    if (timeOptimized > 0) {
        console.log(`Improvement: ${(timeOriginal / timeOptimized).toFixed(2)}x faster`)
    } else {
        console.log(`Optimized time too small to measure improvement ratio.`)
    }

    // 5. Cleanup
    await prisma.program.deleteMany({ where: { universityId: uniProfile.id } })
    await prisma.universityProfile.delete({ where: { id: uniProfile.id } })
    await prisma.user.delete({ where: { id: user.id } })

    await prisma.$disconnect()
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
