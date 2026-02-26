import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const admins = await p.user.findMany({
  where: { role: 'ADMIN' },
  select: { id: true, email: true, role: true, isActive: true, emailVerified: true }
})
console.log('ADMIN USERS:', JSON.stringify(admins, null, 2))

const allUsers = await p.user.findMany({
  select: { id: true, email: true, role: true, isActive: true }
})
console.log('\nALL USERS:', JSON.stringify(allUsers, null, 2))
await p.$disconnect()
