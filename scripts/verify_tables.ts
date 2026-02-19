import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
    console.log('Verifying schema and table names...')
    try {
        // 1. List actual table names in the database
        const tables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `

        const tableNames = tables.map((t: any) => t.table_name).sort()
        console.log('--- FOUND TABLES ---')
        console.log(tableNames.join(', '))
        console.log('--------------------')

        // 2. Verify Prisma Client Access (Count check)
        console.log('\nChecking Prisma Client Access:')

        const sCount = await prisma.studentNotification.count()
        console.log(`✅ StudentNotification (Count: ${sCount})`)

        const uCount = await prisma.universityNotification.count()
        console.log(`✅ UniversityNotification (Count: ${uCount})`)

        const aCount = await prisma.adminAnnouncement.count()
        console.log(`✅ AdminAnnouncement (Count: ${aCount})`)

        const scCount = await prisma.sponsoredContent.count()
        console.log(`✅ SponsoredContent (Count: ${scCount})`)

    } catch (error) {
        console.error('❌ Verification failed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

verify()
