import type { Config } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'
import { sendEmail, generateEmailHtml } from '../../lib/email'

const prisma = new PrismaClient()

// Native Netlify Scheduled Function. Published scheduled functions are protected
// by Netlify's scheduler semantics rather than an application-supplied header.
export default async function handler() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const recentRun = await prisma.systemLog.findFirst({
    where: { type: 'CIRCUIT_STATE_MACHINE', createdAt: { gte: twoHoursAgo }, message: 'State machine run complete' }
  })
  if (recentRun) {
    return new Response('Already ran recently', { status: 200 })
  }

  const now = new Date()

  // PUBLISHED → ONGOING
  const toOngoing = await prisma.fairCircuit.findMany({
    where: {
      status: 'PUBLISHED',
      startDate: { lte: now }
    }
  })

  for (const circuit of toOngoing) {
    await prisma.fairCircuit.update({
      where: { id: circuit.id },
      data: { status: 'ONGOING' }
    })

    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: `Circuit now LIVE — ${circuit.name}`,
        html: generateEmailHtml(
          'Circuit Is Now Live',
          `<p><strong>${circuit.name}</strong> has automatically
          moved to ONGOING status as of today.</p>
          <p>The War Room is now active for all participants.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.edumeetup.com'}/admin/fair-ops/${circuit.id}">
            Open War Room →
          </a>`
        )
      })
    }

    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        type: 'CIRCUIT_STATE_MACHINE',
        message: `${circuit.name} → ONGOING`,
        metadata: { circuitId: circuit.id }
      }
    })
  }

  // ONGOING → COMPLETED
  const toCompleted = await prisma.fairCircuit.findMany({
    where: {
      status: 'ONGOING',
      endDate: { lt: now }
    }
  })

  for (const circuit of toCompleted) {
    await prisma.fairCircuit.update({
      where: { id: circuit.id },
      data: { status: 'COMPLETED' }
    })

    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: `Circuit COMPLETED — ${circuit.name}`,
        html: generateEmailHtml(
          'Circuit Completed',
          `<p><strong>${circuit.name}</strong> has automatically
          moved to COMPLETED status.</p>
          <p>All participant access to the War Room has been set to read-only.</p>`
        )
      })
    }

    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        type: 'CIRCUIT_STATE_MACHINE',
        message: `${circuit.name} → COMPLETED`,
        metadata: { circuitId: circuit.id }
      }
    })
  }

  await prisma.systemLog.create({
    data: {
      level: 'INFO',
      type: 'CIRCUIT_STATE_MACHINE',
      message: 'State machine run complete',
      metadata: {
        toOngoing: toOngoing.length,
        toCompleted: toCompleted.length,
        runAt: now
      }
    }
  })

  return new Response('OK', { status: 200 })
}

export const config: Config = { schedule: '0 0 * * *' }
