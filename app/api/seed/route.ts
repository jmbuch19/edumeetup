import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function GET() {
    try {
        // Create Admin
        const adminEmail = 'jaydeep@edumeetup.com'
        await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                email: adminEmail,
                password: await hashPassword('password123'),
                role: 'ADMIN',
                status: 'ACTIVE',
            },
        })

        // Create Admin User Demo
        const adminEmail2 = 'admin@edumeetup.com'
        await prisma.user.upsert({
            where: { email: adminEmail2 },
            update: { password: await hashPassword('admin123') },
            create: {
                email: adminEmail2,
                password: await hashPassword('admin123'),
                role: 'ADMIN',
                status: 'ACTIVE'
            }
        })

        // Create Student
        const studentEmail = 'student@example.com'
        await prisma.user.upsert({
            where: { email: studentEmail },
            update: {},
            create: {
                email: studentEmail,
                password: await hashPassword('password123'),
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
                        // Add new required fields with defaults to prevent errors
                        gender: 'Male',
                        ageGroup: '21-25',
                        englishTestType: 'IELTS',
                        englishScore: '7.5',
                        preferredIntake: 'Fall 2025'
                    },
                },
            },
        })

        // Create University
        const uniEmail = 'admissions@harvard.edu'
        await prisma.user.upsert({
            where: { email: uniEmail },
            update: {},
            create: {
                email: uniEmail,
                password: await hashPassword('password123'),
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
                                    programName: 'Computer Science', // ...
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

        // Create Pending University for Demo
        const pendingUniEmail = 'registrar@stanford.edu'
        await prisma.user.upsert({
            where: { email: pendingUniEmail },
            update: {},
            create: {
                email: pendingUniEmail,
                password: await hashPassword('password123'),
                role: 'UNIVERSITY',
                status: 'ACTIVE',
                universityProfile: {
                    create: {
                        institutionName: 'Stanford University',
                        country: 'USA',
                        city: 'Stanford',
                        website: 'https://stanford.edu',
                        contactEmail: 'registrar@stanford.edu',
                        verificationStatus: 'PENDING',
                        repName: 'Jane Smith',
                        repDesignation: 'Registrar',
                        programs: {
                            create: [
                                {
                                    programName: 'Data Science',
                                    degreeLevel: "Master's",
                                    fieldCategory: 'Engineering', // Science is not in enum, using Engineering or similar
                                    tuitionFee: 60000,
                                    intakes: 'Fall 2026',
                                },
                            ],
                        },
                    },
                },
            },
        })

        return NextResponse.json({ message: 'Database seeded successfully' })
    } catch (error) {
        console.error('Seeding failed:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
