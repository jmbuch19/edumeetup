
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSimulation() {
    console.log('Starting Host Fair Simulation...');

    try {
        // 1. Create Host Request
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 60);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 5);

        console.log('Creating Host Request...');
        const request = await prisma.hostRequest.create({
            data: {
                referenceNumber: `TEST-SIM-${Date.now()}`,
                institutionName: 'Test University, Mumbai',
                institutionType: 'UNIVERSITY',
                city: 'Mumbai',
                state: 'Maharashtra',
                websiteUrl: 'https://testuni.edu.in',
                contactName: 'Test Contact',
                contactDesignation: 'Director',
                contactEmail: 'test@testuni.edu.in',
                contactPhone: '+919876543210',
                preferredDateStart: startDate,
                preferredDateEnd: endDate,
                expectedStudentCount: '100-250',
                preferredCountries: ['USA', 'UK'],
                fieldsOfStudy: ['Engineering', 'Business'],
                additionalRequirements: 'Seeking top-tier universities.',
                status: 'SUBMITTED'
            }
        });
        console.log(`Created Request ID: ${request.id}`);

        // 2. Approve Request
        console.log('Approving Request...');
        await prisma.hostRequest.update({
            where: { id: request.id },
            data: { status: 'APPROVED' }
        });
        console.log('Request Approved.');

        // 3. Send Outreach
        const universities = await prisma.university.findMany({
            where: {
                institutionName: { in: ['Harvard University', 'Stanford University'] }
            }
        });

        console.log(`Sending outreach to ${universities.length} universities...`);
        for (const uni of universities) {
            await prisma.hostRequestOutreach.create({
                data: {
                    hostRequestId: request.id,
                    universityId: uni.id,
                    status: 'SENT'
                }
            });
            console.log(`- Sent to ${uni.institutionName}`);
        }

        // 4. Simulate Response
        const harvard = universities.find(u => u.institutionName.includes('Harvard'));
        if (harvard) {
            console.log('Simulating response from Harvard...');
            await prisma.hostRequestOutreach.update({
                where: {
                    hostRequestId_universityId: {
                        hostRequestId: request.id,
                        universityId: harvard.id
                    }
                },
                data: {
                    status: 'INTERESTED',
                    respondedAt: new Date(),
                    responseNote: 'We are very interested in visiting Mumbai!'
                }
            });
            console.log('Harvard responded: INTERESTED');
        }

        console.log('Simulation Complete!');

    } catch (error) {
        console.error('Simulation Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runSimulation();
