import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Simulate what PrismaAdapter.getUserByEmail returns for admin
const user = await prisma.user.findUnique({
  where: { email: 'admin@edumeetup.com' },
  select: { id: true, name: true, email: true, emailVerified: true, image: true, role: true }
})
console.log('Admin user from DB:', user)

// Check remaining VerificationTokens
const tokens = await prisma.verificationToken.findMany({
  where: { identifier: 'admin@edumeetup.com' }
})
console.log('Pending verification tokens for admin:', tokens.length, tokens.map(t => ({ expires: t.expires })))

await prisma.$disconnect()
