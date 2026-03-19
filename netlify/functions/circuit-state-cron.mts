import { schedule } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'
import { sendEmail, generateEmailHtml } from '../../lib/email'

const prisma = new PrismaClient()

export const handler = schedule('0 0 * * *', async () => {
  const now = new Date()

  // PUBLISHED → ONGOING
  // Find circuits where status=PUBLISHED and startDate <= now
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

    // Notify admin
    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: `Circuit now LIVE — ${circuit.name}`,
        html: generateEmailHtml(
          'Circuit Is Now Live',
          `<p><strong>${circuit.name}</strong> has automatically 
          moved to ONGOING status as of today.</p>
          <p>The War Room is now active for all participants.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/admin/fair-ops/${circuit.id}">
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
  // Find circuits where status=ONGOING and endDate < now
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

    // Notify admin
    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
        await sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: `Circuit COMPLETED — ${circuit.name}`,
        html: generateEmailHtml(
            'Circuit Completed',
            `<p><strong>${circuit.name}</strong> has automatically 
            moved to COMPLETED status.</p>
            <p>All participant access to the War Room has been 
            set to read-only.</p>`
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

  // Log total run
  await prisma.systemLog.create({
    data: {
      level: 'INFO',
      type: 'CIRCUIT_STATE_MACHINE',
      message: `State machine run complete`,
      metadata: {
        toOngoing: toOngoing.length,
        toCompleted: toCompleted.length,
        runAt: now
      }
    }
  })
  
  return { statusCode: 200 }
})
