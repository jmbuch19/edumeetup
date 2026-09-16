export enum MeetingStatus {
    DRAFT = 'DRAFT',
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    RESCHEDULE_PROPOSED = 'RESCHEDULE_PROPOSED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED',
    NO_SHOW = 'NO_SHOW'
}

const VALID_TRANSITIONS: Record<string, string[]> = {
    [MeetingStatus.DRAFT]: [MeetingStatus.PENDING, MeetingStatus.CANCELLED],
    [MeetingStatus.PENDING]: [MeetingStatus.CONFIRMED, MeetingStatus.RESCHEDULE_PROPOSED, MeetingStatus.CANCELLED],
    [MeetingStatus.CONFIRMED]: [MeetingStatus.RESCHEDULE_PROPOSED, MeetingStatus.CANCELLED, MeetingStatus.COMPLETED, MeetingStatus.NO_SHOW],
    [MeetingStatus.RESCHEDULE_PROPOSED]: [MeetingStatus.CONFIRMED, MeetingStatus.CANCELLED],
    [MeetingStatus.CANCELLED]: [],
    [MeetingStatus.COMPLETED]: [],
    [MeetingStatus.NO_SHOW]: [],
}

export function validateMeetingTransition(currentStatus: string, nextStatus: string): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus] || []
    return allowed.includes(nextStatus)
}

export function canCancel(status: string): boolean {
    return status === MeetingStatus.DRAFT ||
        status === MeetingStatus.PENDING ||
        status === MeetingStatus.CONFIRMED ||
        status === MeetingStatus.RESCHEDULE_PROPOSED
}
