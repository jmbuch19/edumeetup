
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs' // Need to install bcryptjs or use simple hash for MVP?
// Using simple string for MVP since we don't have bcrypt yet, or install it. 
// Actually, for MVP let's just use plain text for now or install bcrypt.
// Let's install bcryptjs.

const prisma = new PrismaClient()

async function main() {
    // Create Admin
    const adminEmail = 'jaydeep@edumeetup.com'
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            password: 'password123', // In real app, hash this
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    })
    console.log({ admin })

    // Create Student
    const studentEmail = 'student@example.com'
    const student = await prisma.user.upsert({
        where: { email: studentEmail },
        update: {},
        create: {
            email: studentEmail,
            password: 'password123',
            role: 'STUDENT',
            status: 'ACTIVE',
            studentProfile: {
                create: {
                    fullName: 'John Doe',
                    country: 'India',
                    currentStatus: 'Undergraduate Student',
                    yearOfPassing: 2024,
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
            password: 'password123',
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
                                fieldOfStudy: 'Engineering',
                                tuitionFee: 50000,
                                intakeDate: 'Fall 2025',
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
