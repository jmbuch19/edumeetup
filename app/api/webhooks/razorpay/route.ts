import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text()
        const signature = req.headers.get('x-razorpay-signature')
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
        }
        if (!secret) {
            console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 503 })
        }

        const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
        const sigBuffer = Buffer.from(signature, 'utf8')
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
        if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        let event: any
        try {
            event = JSON.parse(rawBody)
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
        }

        if (event?.event !== 'payment.captured') {
            return NextResponse.json({ success: true })
        }

        const entity = event?.payload?.payment?.entity
        const razorpayOrderId = typeof entity?.order_id === 'string' ? entity.order_id : ''
        const razorpayPaymentId = typeof entity?.id === 'string' ? entity.id : ''
        const amountCaptured = Number(entity?.amount)
        const currency = typeof entity?.currency === 'string' ? entity.currency.toUpperCase() : ''

        if (!razorpayOrderId || !razorpayPaymentId || !Number.isSafeInteger(amountCaptured) || amountCaptured <= 0 || !currency) {
            return NextResponse.json({ error: 'Malformed payment payload' }, { status: 400 })
        }

        const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } })
        if (!payment) {
            return NextResponse.json({ error: 'Payment record unmapped' }, { status: 404 })
        }

        // Provider-signed payload must still match the server-created order exactly.
        if (amountCaptured !== payment.amountRequested || currency !== payment.currency.toUpperCase()) {
            await prisma.systemLog.create({
                data: {
                    type: 'PAYMENT_AMOUNT_MISMATCH',
                    level: 'ERROR',
                    message: 'Captured payment did not match the server-created order',
                    metadata: {
                        razorpayOrderId,
                        razorpayPaymentId,
                        expectedAmount: payment.amountRequested,
                        capturedAmount: amountCaptured,
                        expectedCurrency: payment.currency,
                        capturedCurrency: currency,
                    },
                },
            })
            return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 })
        }

        if (!payment.circuitRegId) {
            console.error('[razorpay-webhook] Payment has no circuit registration')
            return NextResponse.json({ error: 'Payment record incomplete' }, { status: 409 })
        }

        const processed = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Atomic status transition prevents concurrent duplicate webhooks from both winning.
            const locked = await tx.payment.updateMany({
                where: { id: payment.id, status: { not: 'PAID' } },
                data: {
                    status: 'PAID',
                    amountCaptured,
                    razorpayPaymentId,
                },
            })

            if (locked.count !== 1) return false

            await tx.circuitRegistration.update({
                where: { id: payment.circuitRegId! },
                data: { status: 'CONFIRMED' },
            })
            return true
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

        if (!processed) {
            await prisma.systemLog.create({
                data: {
                    type: 'PAYMENT_REPLAY_ATTEMPT',
                    level: 'WARN',
                    message: 'Duplicate Razorpay payment webhook ignored',
                    metadata: { razorpayOrderId, razorpayPaymentId },
                },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error?.code === 'P2002') {
            // razorpayPaymentId is unique; a duplicate provider event is already processed.
            return NextResponse.json({ success: true })
        }
        console.error('[razorpay-webhook] Processing failed')
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
