import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRazorpayInstance } from '@/lib/razorpay'

const requestSchema = z.object({
    circuitRegistrationId: z.string().cuid(),
})

function getCircuitPriceInPaise(): number | null {
    const raw = process.env.CIRCUIT_PRICE_INR
    if (!raw) return 8_000_000 // ₹80,000, stored in paise

    // Preserve the existing deployment contract: CIRCUIT_PRICE_INR currently stores paise.
    const value = Number(raw)
    if (!Number.isSafeInteger(value) || value <= 0 || value > 100_000_000) return null
    return value
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== 'UNIVERSITY') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const parsed = requestSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid circuitRegistrationId' }, { status: 400 })
        }

        const university = await prisma.university.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        })
        if (!university) {
            return NextResponse.json({ error: 'University profile not found' }, { status: 404 })
        }

        const registration = await prisma.circuitRegistration.findUnique({
            where: { id: parsed.data.circuitRegistrationId },
            select: { id: true, universityId: true, status: true },
        })
        if (!registration || registration.universityId !== university.id) {
            return NextResponse.json({ error: 'Invalid registration' }, { status: 404 })
        }
        if (registration.status === 'CONFIRMED') {
            return NextResponse.json({ error: 'Already paid' }, { status: 409 })
        }

        const priceInPaise = getCircuitPriceInPaise()
        if (!priceInPaise) {
            console.error('[create-order] Invalid CIRCUIT_PRICE_INR configuration')
            return NextResponse.json({ error: 'Payment pricing is not configured' }, { status: 503 })
        }

        const razorpay = getRazorpayInstance()
        const order = await razorpay.orders.create({
            amount: priceInPaise,
            currency: 'INR',
            receipt: `rcpt_${registration.id.substring(0, 10)}`,
            notes: {
                circuitRegistrationId: registration.id,
                universityId: university.id,
            },
        })

        await prisma.payment.create({
            data: {
                razorpayOrderId: order.id,
                amountRequested: priceInPaise,
                currency: 'INR',
                status: 'CREATED',
                universityId: university.id,
                circuitRegId: registration.id,
            },
        })

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: priceInPaise,
            currency: 'INR',
        }, {
            headers: { 'Cache-Control': 'no-store' },
        })
    } catch {
        console.error('[create-order] Failed')
        return NextResponse.json({ error: 'Failed to initialize payment gateway' }, { status: 500 })
    }
}
