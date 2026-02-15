import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Create Admin
    const adminEmail = 'jaydeep@edumeetup.com'
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            password: await hash('password123', 12),
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    })
    console.log({ admin })

    // Create Admin User
    const adminEmail2 = 'admin@edumeetup.com' // Renamed to avoid conflict with previous adminEmail
    const admin2 = await prisma.user.upsert({ // Renamed to avoid conflict with previous admin
        where: { email: adminEmail2 },
        update: { password: await hash('admin123', 12) }, // Force update password
        create: {
            email: adminEmail2,
            password: await hash('admin123', 12),
            role: 'ADMIN',
            status: 'ACTIVE'
        }
    })
    console.log({ admin: admin2 }) // Log with a distinct name

    // Create Student
    const studentEmail = 'student@example.com'
    const student = await prisma.user.upsert({
        where: { email: studentEmail },
        update: {},
        create: {
            email: studentEmail,
            password: await hash('password123', 12),
            role: 'STUDENT',
            status: 'ACTIVE',
            studentProfile: {
                create: {
                    fullName: 'John Doe',
                    country: 'India',
                    currentStatus: 'Undergraduate Student',
                    fieldOfInterest: 'Computer Science',
                    preferredCountries: 'USA, UK',
                    preferredDegree: "Master's",
                    budgetRange: '$20K-$30K',
                    profileComplete: true,
                },
            },
        },
    })
    console.log({ student })

    // Create University
    const uniEmail = 'admissions@harvard.edu'
    const uni = await prisma.user.upsert({
        where: { email: uniEmail },
        update: {},
        create: {
            email: uniEmail,
            password: await hash('password123', 12),
            role: 'UNIVERSITY',
            status: 'ACTIVE',
            universityProfile: {
                create: {
                    institutionName: 'Harvard University',
                    country: 'USA',
                    city: 'Cambridge',
                    website: 'https://harvard.edu',
                    contactEmail: 'admissions@harvard.edu',
                    verificationStatus: 'VERIFIED',
                    verifiedDate: new Date(),
                    programs: {
                        create: [
                            {
                                programName: 'Computer Science',
                                degreeLevel: "Master's",
                                fieldCategory: 'Engineering',
                                tuitionFee: 50000,
                                intakes: 'Fall 2025',
                            },
                        ],
                    },
                },
            },
        },
    })
    console.log({ uni })
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
