import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRazorpayInstance } from '@/lib/razorpay'

// T21: Server-Side Order Generation
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== 'UNIVERSITY') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { circuitRegistrationId } = await req.json()
        if (!circuitRegistrationId) {
            return NextResponse.json({ error: 'Missing circuitRegistrationId' }, { status: 400 })
        }

        const university = await prisma.university.findUnique({
            where: { userId: session.user.id }
        })

        if (!university) {
            return NextResponse.json({ error: 'University profile not found' }, { status: 404 })
        }

        const registration = await prisma.circuitRegistration.findUnique({
            where: { id: circuitRegistrationId }
        })

        if (!registration || registration.universityId !== university.id) {
            return NextResponse.json({ error: 'Invalid registration' }, { status: 400 })
        }

        if (registration.status === 'CONFIRMED') {
            return NextResponse.json({ error: 'Already paid' }, { status: 400 })
        }

        // T21: Server-controlled pricing (never trusts the client)
        // Hardcode MVP price (₹80,000 INR = 8000000 paise), optionally overridable by env
        const priceInPaise = process.env.CIRCUIT_PRICE_INR 
            ? parseInt(process.env.CIRCUIT_PRICE_INR, 10) 
            : 8000000 

        const razorpay = getRazorpayInstance()

        // Create the Razorpay Order
        const order = await razorpay.orders.create({
            amount: priceInPaise,
            currency: 'INR',
            receipt: `rcpt_${circuitRegistrationId.substring(0, 10)}`,
            notes: {
                circuitRegistrationId,
                universityId: university.id
            }
        })

        // Save intent to DB
        await prisma.payment.create({
            data: {
                razorpayOrderId: order.id,
                amountRequested: priceInPaise,
                currency: 'INR',
                status: 'CREATED',
                universityId: university.id,
                circuitRegId: circuitRegistrationId
            }
        })

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: priceInPaise,
            currency: 'INR'
        })

    } catch (error: any) {
        console.error('[create-order error]:', error)
        return NextResponse.json({ error: 'Failed to initialize payment gateway' }, { status: 500 })
    }
}
