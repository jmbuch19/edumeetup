import { schedule } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'
import { sendEmail, generateEmailHtml } from '../../lib/email'

const prisma = new PrismaClient()

// Run weekly on Monday at 9AM
export const handler = schedule('0 9 * * 1', async () => {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const now = new Date()

  // Find all universities registered for published circuits starting in < 30 days that lack a rep assignment
  const missingReps = await prisma.circuitRegistration.findMany({
    where: {
      repId: null,
      circuit: {
        status: 'PUBLISHED',
        startDate: { gt: now, lt: thirtyDaysFromNow }
      }
    },
    include: { university: true, circuit: true }
  })

  let emailsSent = 0;
  for (const reg of missingReps) {
     // Find university admins to email
     const admins = await prisma.user.findMany({
       where: { universityId: reg.universityId, role: { in: ['UNIVERSITY_ADMIN'] } }
     })

     for (const admin of admins) {
       await sendEmail({
         to: admin.email,
         subject: `Action Required: Assign Representative for ${reg.circuit.name}`,
         html: generateEmailHtml(
            'Action Required',
            `<p>Hi ${admin.name || 'there'},</p>
            <p>Your university is registered for <strong>${reg.circuit.name}</strong>, which starts in less than 30 days!</p>
            <p>However, you have not yet assigned a Representative to this circuit. Your account will not be fully activated in the War Room until a Representative is assigned.</p>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/fairs">Assign Representative Now →</a></p>`
         )
       })
       emailsSent++;
     }
  }

  await prisma.systemLog.create({
     data: {
       level: 'INFO',
       type: 'UNI_RSVP_CRON',
       message: `Sent ${emailsSent} reminder emails to universities missing rep assignments for upcoming circuits.`,
       metadata: { emailsSent, circuitsCount: missingReps.length }
     }
  })
  
  return { statusCode: 200 }
})
