import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        // T19: Raw body extraction required for deterministic HMAC hash verification
        const rawBody = await req.text()
        const signature = req.headers.get('x-razorpay-signature')

        if (!signature) {
            return NextResponse.json({ error: 'Missing Signature' }, { status: 400 })
        }

        const secret = process.env.RAZORPAY_WEBHOOK_SECRET
        if (!secret) {
            console.error('[CRITICAL] RAZORPAY_WEBHOOK_SECRET omitted during request verification.')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex')

        const sigBuffer = Buffer.from(signature, 'utf8')
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

        if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            return NextResponse.json({ error: 'Spoofed signature detected' }, { status: 400 })
        }

        // Now that the cryptographic signature is cleared, we parse the JSON
        const event = JSON.parse(rawBody)

        if (event.event === 'payment.captured') {
            const paymentPayload = event.payload.payment.entity
            const razorpayOrderId = paymentPayload.order_id
            const razorpayPaymentId = paymentPayload.id
            const amountCaptured = paymentPayload.amount

            // Map it back to our invoice
            const payment = await prisma.payment.findUnique({
                where: { razorpayOrderId }
            })

            if (!payment) {
                return NextResponse.json({ error: 'Payment record unmapped' }, { status: 404 })
            }

            // T20: Replay Attack Idempotency
            if (payment.status === 'PAID') {
                await prisma.systemLog.create({
                    data: {
                        type: 'PAYMENT_REPLAY_ATTEMPT',
                        level: 'WARN',
                        message: 'Webhook duplicate or replay attack bounced',
                        metadata: { razorpayOrderId, razorpayPaymentId }
                    }
                })
                // Drop out silently to trick the attacker/webhook that it succeeded
                return NextResponse.json({ success: true, message: 'Idempotency locked' })
            }

            // Lock it in
            await prisma.$transaction([
                // 1. Advance the Payment
                prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'PAID',
                        amountCaptured,
                        razorpayPaymentId
                    }
                }),
                // 2. Automagically grant War Room clearance (T12)
                prisma.circuitRegistration.update({
                    where: { id: payment.circuitRegId! },
                    data: { status: 'CONFIRMED' }
                })
            ])
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[webhook error]:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
