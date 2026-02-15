import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        // Create Admin
        const adminEmail = 'jaydeep@edumeetup.com'
        await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                email: adminEmail,
                password: 'password123',
                role: 'ADMIN',
                status: 'ACTIVE',
            },
        })

        // Create Admin User Demo
        const adminEmail2 = 'admin@edumeetup.com'
        await prisma.user.upsert({
            where: { email: adminEmail2 },
            update: { password: 'admin123' },
            create: {
                email: adminEmail2,
                password: 'admin123',
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
                password: 'password123',
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

        return NextResponse.json({ message: 'Database seeded successfully' })
    } catch (error: any) {
        console.error('Seeding failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
