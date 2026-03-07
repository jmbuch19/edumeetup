import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const event = await prisma.fairEvent.create({
    data: {
        name: 'EduMeetup Mumbai Fair 2026',
        slug: 'mumbai-2026',
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-10'),
        status: 'LIVE',
        city: 'Mumbai',
    },
})

console.log('Created FairEvent:')
console.log('  id    :', event.id)
console.log('  name  :', event.name)
console.log('  slug  :', event.slug)
console.log('  status:', event.status)
console.log()
console.log('Registration URL:')
console.log(`  http://localhost:3000/fair?eventId=${event.id}`)

await prisma.$disconnect()
