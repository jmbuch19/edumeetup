import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { expressInterest } from '@/app/actions'
import { studentInteractionSchema } from '@/lib/schemas'

export async function POST(req: Request) {
    try {
        const user = await requireUser()
        if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const validation = studentInteractionSchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
        }

        const { universityId, programId } = validation.data

        const result = await expressInterest(universityId, user.email || undefined, programId || undefined)
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 })
    }
}
