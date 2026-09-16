import { NextResponse } from 'next/server'

/**
 * Legacy MeetingRequest endpoint.
 *
 * The production booking flow is /student/book/[universityId], which reserves an
 * authoritative AvailabilitySlot and creates a Meeting transactionally. Keeping
 * this older endpoint writable would re-introduce a second scheduling state
 * machine with no slot locking, rep assignment, lead-time, or overlap checks.
 */
export async function POST() {
    return NextResponse.json(
        {
            error: 'This legacy meeting-request endpoint has been retired. Use the student booking flow instead.',
        },
        { status: 410 }
    )
}
