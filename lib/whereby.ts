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
 * Creates a Whereby meeting room for a group session.
 * Uses roomMode 'group' — correct for small groups with a designated host.
 * endDate = session end + 30min buffer so room doesn't expire mid-session.
 *
 * @param sessionTitle  Used as room name prefix (sanitised to a-z0-9-)
 * @param durationMinutes  Session duration — room expires endDate + 1h (Whereby default)
 */
export async function createWherebyMeeting(
    sessionTitle: string,
    durationMinutes: number,
): Promise<WherebyRoom> {
    if (!API_KEY) throw new Error('WHEREBY_API_KEY is not set')

    // Room expires at session end + 30min buffer
    const endDate = new Date(Date.now() + (durationMinutes + 30) * 60 * 1000)

    // Sanitise prefix: lowercase, strip non-alphanumeric, max 39 chars
    const roomNamePrefix = sessionTitle
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 39) || 'edumeetup'

    const response = await fetch(`${WHEREBY_API}/meetings`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            endDate: endDate.toISOString(),
            roomMode: 'group',      // 'group' = host controls, breakout rooms, up to 200
            roomNamePrefix,
            roomNamePattern: 'uuid',
            fields: ['hostRoomUrl'],
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
