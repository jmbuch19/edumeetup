
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUniversities() {
    try {
        const universities = await prisma.university.findMany({
            take: 5,
            select: { id: true, institutionName: true }
        });
        console.log('Available Universities:', universities);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUniversities();
