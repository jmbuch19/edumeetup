const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding (JS user)...')

    const password = await hash('password123', 10)

    // 1. Create a University
    const uniUser = await prisma.user.upsert({
        where: { email: 'uni@example.com' },
        update: {
            password: password
        },
        create: {
            email: 'uni@example.com',
            password,
            role: 'UNIVERSITY',
            status: 'ACTIVE',
            universityProfile: {
                create: {
                    institutionName: 'Global Tech University',
                    country: 'USA',
                    city: 'San Francisco',
                    website: 'https://globaltech.edu',
                    contactEmail: 'admissions@globaltech.edu',
                    verificationStatus: 'VERIFIED',
                    verifiedDate: new Date(),
                    programs: {
                        create: [
                            {
                                programName: "M.Sc. Computer Science",
                                degreeLevel: "Masters",
                                fieldOfStudy: "Computer Science",
                                tuitionFee: 25000,
                                currency: "USD",
                                intakeDate: "Fall 2026",
                                status: "ACTIVE"
                            },
                            {
                                programName: "MBA",
                                degreeLevel: "Masters",
                                fieldOfStudy: "Business",
                                tuitionFee: 35000,
                                currency: "USD",
                                intakeDate: "Fall 2026",
                                status: "ACTIVE"
                            }
                        ]
                    }
                }
            },
        },
    })

    console.log(`Created/Updated University: ${uniUser.email}`)

    // 2. Create Students
    const student1 = await prisma.user.upsert({
        where: { email: 'student1@example.com' },
        update: {
            password: password
        },
        create: {
            email: 'student1@example.com',
            password,
            role: 'STUDENT',
            status: 'ACTIVE',
            studentProfile: {
                create: {
                    fullName: "Alice Student",
                    country: "India",
                    currentStatus: "Undergraduate",
                    fieldOfInterest: "Computer Science",
                    preferredCountries: "USA, Canada",
                    profileComplete: true
                }
            }
        },
    })
    console.log(`Created/Updated Student: ${student1.email}`)

    const student2 = await prisma.user.upsert({
        where: { email: 'student2@example.com' },
        update: {
            password: password
        },
        create: {
            email: 'student2@example.com',
            password,
            role: 'STUDENT',
            status: 'ACTIVE',
            studentProfile: {
                create: {
                    fullName: "Bob Learner",
                    country: "Nigeria",
                    currentStatus: "Graduate",
                    fieldOfInterest: "Business",
                    preferredCountries: "USA, UK",
                    profileComplete: true
                }
            }
        },
    })
    console.log(`Created/Updated Student: ${student2.email}`)

    console.log('Seeding finished.')
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
