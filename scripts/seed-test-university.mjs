import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const UNI_EMAIL = 'rep@oxford-test.edu'
const FAIR_EVENT_ID = 'cmmbnk7az000087ym5bslu8he'

// Create User (UNIVERSITY role)
const user = await prisma.user.upsert({
    where: { email: UNI_EMAIL },
    update: {},
    create: {
        email: UNI_EMAIL,
        name: 'Oxford Test Rep',
        role: 'UNIVERSITY',
        emailVerified: new Date(),
    },
})

// Create University linked to user
const uni = await prisma.university.upsert({
    where: { userId: user.id },
    update: {},
    create: {
        userId: user.id,
        institutionName: 'Oxford Test University',
        country: 'United Kingdom',
        city: 'Oxford',
        website: 'https://ox.ac.uk',
        verificationStatus: 'VERIFIED',
        logo: null,
        about: 'A prestigious test university for fair demo purposes.',
        repName: 'Dr. James Smith',
        repEmail: UNI_EMAIL,
        contactEmail: UNI_EMAIL,
    },
})

// Update user with universityId (for UNIVERSITY_REP style access)
await prisma.user.update({
    where: { id: user.id },
    data: { universityId: uni.id },
})

// Create some programs
const programs = await Promise.all([
    prisma.program.upsert({
        where: { id: 'prog-test-1' },
        update: {},
        create: {
            id: 'prog-test-1',
            universityId: uni.id,
            programName: 'MSc Computer Science',
            degreeLevel: 'Masters',
            fieldCategory: 'Computer_Science',
            durationMonths: 12,
            tuitionFee: 25000,
            currency: 'GBP',
            intakes: ['September', 'January'],
            englishTests: ['IELTS', 'TOEFL'],
            status: 'ACTIVE',
        },
    }),
    prisma.program.upsert({
        where: { id: 'prog-test-2' },
        update: {},
        create: {
            id: 'prog-test-2',
            universityId: uni.id,
            programName: 'MBA Business Administration',
            degreeLevel: 'Masters',
            fieldCategory: 'Business',
            durationMonths: 12,
            tuitionFee: 35000,
            currency: 'GBP',
            intakes: ['September'],
            englishTests: ['IELTS', 'GMAT'],
            status: 'ACTIVE',
        },
    }),
])

console.log('✅ Test university created:')
console.log(`   University : ${uni.institutionName} [${uni.id}]`)
console.log(`   Rep email  : ${UNI_EMAIL}`)
console.log(`   Programs   : ${programs.map(p => p.programName).join(', ')}`)
console.log()
console.log('🔗 Next steps:')
console.log(`1. Open dev login:  http://localhost:3000/api/dev-login`)
console.log(`   Type email: ${UNI_EMAIL}  → click Go →`)
console.log()
console.log(`2. Go to scanner:`)
console.log(`   http://localhost:3000/event/${FAIR_EVENT_ID}/scan`)
console.log()
console.log(`3. Or visit the fair report:`)
console.log(`   http://localhost:3000/dashboard/university/fair-report/${FAIR_EVENT_ID}`)

await prisma.$disconnect()
