// lib/whereby.ts
// Server-side helper to create Whereby meeting rooms.
// One API key for the whole app — no per-user OAuth needed.

const WHEREBY_API = 'https://api.whereby.dev/v1'
const API_KEY = process.env.WHEREBY_API_KEY

export interface WherebyRoom {
    meetingId: string
    startDate: string
    endDate: string
    roomUrl: string        // student join link
    hostRoomUrl: string    // university host link (has host controls)
}

/**
 * Creates a Whereby meeting room for a given time slot.
 * endDate defaults to startDate + 1 hour if not provided.
 */
export async function createWherebyMeeting(
    startTime: Date,
    endTime: Date,
    roomNamePrefix = 'edumeetup'
): Promise<WherebyRoom> {
    if (!API_KEY) throw new Error('WHEREBY_API_KEY is not set')

    // Whereby requires endDate to be in the future
    // Add 24h buffer to be safe with scheduling edge cases
    const endDate = new Date(endTime)

    const response = await fetch(`${WHEREBY_API}/meetings`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            endDate: endDate.toISOString(),
            fields: ['hostRoomUrl'],
            roomMode: 'normal',        // 'normal' = up to 100 participants, 'group' = 200+
            recording: { type: 'none' },
        }),
    })

    if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Whereby API error ${response.status}: ${errorBody}`)
    }

    const data = await response.json()

    return {
        meetingId: data.meetingId,
        startDate: data.startDate,
        endDate: data.endDate,
        roomUrl: data.roomUrl,
        hostRoomUrl: data.hostRoomUrl,
    }
}
