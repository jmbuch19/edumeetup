
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHostRequest() {
    try {
        const request = await prisma.hostRequest.findFirst({
            where: {
                institutionName: { contains: 'Test University' }
            },
            include: {
                outreach: {
                    include: {
                        university: true
                    }
                }
            }
        });

        if (request) {
            console.log('Found Host Request:');
            console.log(`- ID: ${request.id}`);
            console.log(`- Institution: ${request.institutionName}`);
            console.log(`- Contact: ${request.contactEmail}`);
            console.log(`- Status: ${request.status}`);
            console.log(`- Reference: ${request.referenceNumber}`);
            console.log(`- Outreach Count: ${request.outreach.length}`);
            request.outreach.forEach(o => {
                console.log(`  - Outreach to: ${o.university.institutionName} | Status: ${o.status}`);
            });
        } else {
            console.log('No Host Request found for "Test University".');
        }
    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkHostRequest();
