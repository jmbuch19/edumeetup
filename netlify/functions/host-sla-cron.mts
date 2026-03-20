import type { Config } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'
import { sendEmail, generateEmailHtml } from '../../lib/email'

const prisma = new PrismaClient()

// Run daily at 9am
export default async function handler(request: Request) {
  // MUST be first — before prisma queries, before anything
  const incomingSecret = request.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && incomingSecret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const recentRun = await prisma.systemLog.findFirst({
    where: { type: 'HOST_SLA_CRON_RUN', createdAt: { gte: twoHoursAgo } }
  })
  if (recentRun) {
    return new Response('Already ran recently', { status: 200 })
  }

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

  await prisma.systemLog.create({
    data: {
      level: 'INFO',
      type: 'HOST_SLA_CRON_RUN',
      message: 'Host SLA Cron execution complete',
      metadata: { pendingCount: pending.length }
    }
  })

  return new Response('OK', { status: 200 })
}

export const config: Config = { schedule: '0 9 * * *' }
