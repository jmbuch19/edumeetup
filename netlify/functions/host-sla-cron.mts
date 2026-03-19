import { schedule } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'
import { sendEmail, generateEmailHtml } from '../../lib/email'

const prisma = new PrismaClient()

// Run daily at 9am
export const handler = schedule('0 9 * * *', async () => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const pending = await prisma.hostRequest.findMany({
    where: { status: 'SUBMITTED', createdAt: { lt: cutoff } }
  })

  if (pending.length > 0) {
    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
        await sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: `[SLA BREACH] ${pending.length} Host Requests > 48 Hours`,
        html: generateEmailHtml(
            'SLA Breach Alert',
            `<p><strong>${pending.length}</strong> campus fair requests have been awaiting review for over 48 hours.</p>
            <p>Please review them immediately.</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/admin/host-requests">Open Admin Dashboard →</a>`
        )
        })
    }

    await prisma.systemLog.create({
      data: {
        level: 'WARN',
        type: 'HOST_SLA_CRON',
        message: `${pending.length} host requests breached 48h SLA`,
        metadata: { count: pending.length }
      }
    })
  }

  return { statusCode: 200 }
})
