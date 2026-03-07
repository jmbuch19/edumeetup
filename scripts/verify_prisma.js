
const client = require('@prisma/client');
console.log('Keys:', Object.keys(client));
console.log('FieldCategory direct:', client.FieldCategory);
console.log('Prisma Namespace Keys:', Object.keys(client.Prisma || {}));
const prisma = new client.PrismaClient();
console.log('Meeting Model:', !!prisma.meeting);
console.log('AvailabilitySlot Model:', !!prisma.availabilitySlot);
console.log('MeetingParticipant Model:', !!prisma.meetingParticipant);
