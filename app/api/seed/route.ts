import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    // Only runnable with the admin secret (or in development without one configured)
    const adminSecret = process.env.ADMIN_SECRET
    if (adminSecret) {
        const authHeader = request.headers.get('Authorization')
        if (authHeader !== `Bearer ${adminSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    } else if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'ADMIN_SECRET not configured' }, { status: 503 })
    }


    try {
        // Create Admin
        const adminEmail = 'jaydeep@edumeetup.com'
        await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                email: adminEmail,
                role: 'ADMIN',
                isActive: true,
            },
        })

        // Create Admin User Demo
        const adminEmail2 = 'admin@edumeetup.com'
        await prisma.user.upsert({
            where: { email: adminEmail2 },
            update: {},
            create: {
                email: adminEmail2,
                role: 'ADMIN',
                isActive: true
            }
        })

        // Create Student
        const studentEmail = 'student@example.com'
        await prisma.user.upsert({
            where: { email: studentEmail },
            update: {},
            create: {
                email: studentEmail,
                role: 'STUDENT',
                isActive: true,
                student: {
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
                role: 'UNIVERSITY',
                isActive: true,
                university: {
                    create: {
                        institutionName: 'Harvard University',
                        country: 'USA',
                        city: 'Cambridge',
                        website: 'https://harvard.edu',
                        contactEmail: 'admissions@harvard.edu',
                        verificationStatus: 'VERIFIED',
                        verifiedAt: new Date(),
                        programs: {
                            create: [
                                {
                                    programName: 'Computer Science',
                                    degreeLevel: "Master's",
                                    fieldCategory: 'Engineering',
                                    tuitionFee: 50000,
                                    intakes: ['Fall 2025'],
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
                role: 'UNIVERSITY',
                isActive: true,
                university: {
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
                                    fieldCategory: 'Engineering',
                                    tuitionFee: 60000,
                                    intakes: ['Fall 2026'],
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
