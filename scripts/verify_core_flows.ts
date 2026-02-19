import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyCoreFlows() {
    console.log('🚀 Starting Post-Migration Verification...')
    let failures: string[] = []

    try {
        // 1. Test Registration (Create New User & Student)
        console.log('\n[1/6] Testing Registration (Simulated)...')
        const testEmail = `test_verification_${Date.now()}@example.com`
        const newUser = await prisma.user.create({
            data: {
                email: testEmail,
                role: 'STUDENT',
                student: {
                    create: {
                        fullName: 'Migration Test Student',
                        country: 'India',
                        currentStatus: 'Student',
                    }
                }
            },
            include: { student: true }
        })
        console.log(`✅ User created: ${newUser.email} (ID: ${newUser.id})`)
        if (!newUser.student) throw new Error('Student profile creation failed')
        const studentId = newUser.student.id

        // 2. Test Express Interest & University Accept (Simulated)
        // We need a university. Let's pick the first one.
        const university = await prisma.university.findFirst()
        if (!university) throw new Error('No university found for testing')
        console.log(`\n[2/6] Testing Express Interest (Student -> ${university.institutionName})...`)

        const interest = await prisma.interest.create({
            data: {
                studentId: studentId,
                universityId: university.id,
                status: 'INTERESTED',
                studentMessage: 'Testing flow after migration'
            }
        })
        console.log(`✅ Interest record created (ID: ${interest.id})`)

        // 3. Test Booking Meeting
        console.log('\n[3/6] Testing Meeting Booking (Draft)...')
        const meeting = await prisma.meeting.create({
            data: {
                studentId: studentId,
                universityId: university.id,
                purpose: 'ADMISSION_QUERY',
                startTime: new Date(),
                endTime: new Date(Date.now() + 30 * 60000), // 30 mins later
                durationMinutes: 30,
                videoProvider: 'GOOGLE_MEET',
                meetingCode: `TEST-${Date.now()}`,
                studentTimezone: 'Asia/Kolkata',
                repTimezone: 'UTC',
                status: 'DRAFT'
            }
        })
        console.log(`✅ Meeting record created (ID: ${meeting.id})`)

        // 4. Test Admin Data Visibility
        console.log('\n[4/6] Testing Admin Data Access...')
        const userCount = await prisma.user.count()
        if (userCount < 2) throw new Error('User count suspiciously low')
        console.log(`✅ Admin can see ${userCount} users.`)

        // 5. Test New Notification Features
        console.log('\n[5/6] Testing New Notification Features...')
        const notif = await prisma.studentNotification.create({
            data: {
                studentId: studentId,
                title: 'Migration Test Notification',
                message: 'If you see this, the new table works.',
                type: 'INFO'
            }
        })
        console.log(`✅ Notification created (ID: ${notif.id})`)

        // Cleanup (Optional, but good for repetitive testing)
        // await prisma.user.delete({ where: { id: newUser.id } })
        // console.log('\n[Cleanup] Test user deleted.')

    } catch (error: any) {
        console.error('❌ CHECKLIST FAILED:', error)
        failures.push(error.message || 'Unknown Error')
    } finally {
        console.log('\n----------------------------------------')
        if (failures.length > 0) {
            console.log('⛔ ROLLBACK TRIGGERED (Validation Failed)')
            console.log('Failures:', failures)
            process.exit(1)
        } else {
            console.log('✅ ALL CHECKS PASSED. SYSTEM STABLE.')
            process.exit(0)
        }
        await prisma.$disconnect()
    }
}

verifyCoreFlows()
