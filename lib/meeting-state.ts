export enum MeetingStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

const VALID_TRANSITIONS: Record<string, string[]> = {
    [MeetingStatus.PENDING]: [MeetingStatus.CONFIRMED, MeetingStatus.REJECTED, MeetingStatus.CANCELLED],
    [MeetingStatus.CONFIRMED]: [MeetingStatus.CANCELLED, MeetingStatus.COMPLETED],
    [MeetingStatus.REJECTED]: [], // Terminal
    [MeetingStatus.CANCELLED]: [], // Terminal
    [MeetingStatus.COMPLETED]: [], // Terminal
}

export function validateMeetingTransition(currentStatus: string, nextStatus: string): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus] || []
    return allowed.includes(nextStatus)
}

export function canCancel(status: string): boolean {
    return status === MeetingStatus.PENDING || status === MeetingStatus.CONFIRMED
}
