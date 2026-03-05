/**
 * lib/admin/student-filters.ts
 */

export type StudentForCompleteness = {
    fullName: string | null
    phone: string | null
    city: string | null
    fieldOfInterest: string | null
    preferredDegree: string | null
    preferredCountries: string | null
    budgetRange: string | null
    currentStatus: string | null
    ageGroup: string | null
    gender: string | null
}

export type CompletenessResult = {
    isComplete: boolean
    score: number
    missingFields: string[]
}

export function computeProfileComplete(student: StudentForCompleteness): CompletenessResult {
    const checks = [
        { label: 'Full Name', value: student.fullName },
        { label: 'Phone', value: student.phone },
        { label: 'City', value: student.city },
        { label: 'Field of Interest', value: student.fieldOfInterest },
        { label: 'Preferred Degree', value: student.preferredDegree },
        { label: 'Target Countries', value: student.preferredCountries },
        { label: 'Budget Range', value: student.budgetRange },
        { label: 'Current Status', value: student.currentStatus },
        { label: 'Age Group', value: student.ageGroup },
        { label: 'Gender', value: student.gender },
    ]
    const missingFields = checks.filter(c => !c.value?.trim()).map(c => c.label)
    const score = Math.round(((checks.length - missingFields.length) / checks.length) * 100)
    return { isComplete: missingFields.length === 0, score, missingFields }
}

export type StudentFilter =
    | 'ALL' | 'COMPLETE' | 'INCOMPLETE'
    | 'CV_UPLOADED' | 'NO_CV'
    | 'HAS_INTEREST' | 'NO_INTEREST'
    | 'HAS_MEETING' | 'NO_MEETING'
    | 'HAS_ADVISORY' | 'NO_ADVISORY'
    | 'EMAIL_UNVERIFIED' | 'INACTIVE'
    // ── Fair Mode ────────────────────────────────────────────────────────
    | 'fair_registered'
    | 'fair_walkin'
    | 'fair_attended'
    | 'fair_registered_not_attended'

export type FilterPreset = {
    id: StudentFilter
    label: string
    description: string
    nudgeTemplate?: string
    /** Groups the preset visually in the filter bar without breaking existing behaviour */
    group?: 'FAIR'
}

export const FILTER_PRESETS: FilterPreset[] = [
    { id: 'ALL', label: 'All Students', description: 'Every registered student' },
    { id: 'COMPLETE', label: 'Profile Complete', description: 'All required fields filled' },
    {
        id: 'INCOMPLETE', label: 'Profile Incomplete', description: 'Missing one or more required fields',
        nudgeTemplate: 'Hi {{name}}, your EdUmeetup profile is incomplete. Universities cannot match with you until all fields are filled. It only takes 2 minutes!'
    },
    { id: 'CV_UPLOADED', label: 'CV Uploaded', description: 'Has uploaded a CV' },
    {
        id: 'NO_CV', label: 'No CV', description: 'Has not uploaded a CV yet',
        nudgeTemplate: 'Hi {{name}}, universities love seeing a CV. Upload yours to stand out and get noticed!'
    },
    { id: 'HAS_INTEREST', label: 'Expressed Interest', description: 'Interested in at least one university' },
    {
        id: 'NO_INTEREST', label: 'No Interests Yet', description: 'Never expressed interest',
        nudgeTemplate: 'Hi {{name}}, you have not explored any universities yet. Browse our verified partners and find programmes that match your goals!'
    },
    { id: 'HAS_MEETING', label: 'Has Booked Meeting', description: 'Has at least one meeting' },
    {
        id: 'NO_MEETING', label: 'No Meetings Booked', description: 'Has never booked a meeting',
        nudgeTemplate: 'Hi {{name}}, did you know you can book a free 1-on-1 meeting with university admissions teams on EdUmeetup? No agents, no fees.'
    },
    { id: 'HAS_ADVISORY', label: 'Advisory Requested', description: 'Has an advisory session' },
    {
        id: 'NO_ADVISORY', label: 'No Advisory Session', description: 'Never requested advisory',
        nudgeTemplate: 'Hi {{name}}, our free advisory sessions help you shortlist the right universities. Would you like to schedule one?'
    },
    {
        id: 'EMAIL_UNVERIFIED', label: 'Email Unverified', description: 'emailVerified is null',
        nudgeTemplate: 'Hi {{name}}, your email has not been verified. Please check your inbox or contact us if there is a typo.'
    },
    { id: 'INACTIVE', label: 'Blocked', description: 'isActive is false' },
    // ── Fair Mode ─────────────────────────────────────────────────────────
    {
        id: 'fair_registered', label: 'Registered for Fair', group: 'FAIR' as const,
        description: 'Has at least one fair pass linked to their profile',
        nudgeTemplate: 'Hi {{name}}, complete your profile to apply directly to the universities you met at the fair!',
    },
    {
        id: 'fair_attended', label: 'Visited University Booth', group: 'FAIR' as const,
        description: 'Scanned at one or more university booths',
        nudgeTemplate: 'Hi {{name}}, the universities you visited at the fair are waiting. Apply directly through EdUmeetup today!',
    },
    {
        id: 'fair_registered_not_attended', label: 'Registered but Didn\u2019t Attend', group: 'FAIR' as const,
        description: 'Got a QR pass but never visited a booth',
        nudgeTemplate: 'Hi {{name}}, you registered for a fair but we didn\u2019t see you at any booths. Explore our partner universities and book a free 1-on-1 meeting!',
    },
    {
        id: 'fair_walkin', label: 'Walk-in (No Full Profile)', group: 'FAIR' as const,
        description: 'Registered at fair venue — no full edUmeetup profile yet. Email only.',
        nudgeTemplate: 'Join edUmeetup to apply directly to the universities you visited at the fair.',
    },
]

export function buildFilterWhere(filter: StudentFilter) {
    const base = { role: 'STUDENT' as const }
    switch (filter) {
        case 'COMPLETE': return { ...base, student: { profileComplete: true } }
        case 'INCOMPLETE': return { ...base, student: { profileComplete: false } }
        case 'CV_UPLOADED': return { ...base, student: { cvUrl: { not: null } } }
        case 'NO_CV': return { ...base, student: { cvUrl: null } }
        case 'HAS_INTEREST': return { ...base, student: { interests: { some: {} } } }
        case 'NO_INTEREST': return { ...base, student: { interests: { none: {} } } }
        case 'HAS_MEETING': return { ...base, student: { meetings: { some: {} } } }
        case 'NO_MEETING': return { ...base, student: { meetings: { none: {} } } }
        case 'HAS_ADVISORY': return { ...base, student: { advisoryRequests: { some: {} } } }
        case 'NO_ADVISORY': return { ...base, student: { advisoryRequests: { none: {} } } }
        case 'EMAIL_UNVERIFIED': return { ...base, emailVerified: null }
        case 'INACTIVE': return { ...base, isActive: false }
        // ── Fair Mode ─────────────────────────────────────────────────────
        case 'fair_registered':
            return { ...base, student: { fairPasses: { some: {} } } }
        case 'fair_attended':
            return { ...base, student: { fairPasses: { some: { attendances: { some: {} } } } } }
        case 'fair_registered_not_attended':
            return { ...base, student: { fairPasses: { some: { attendances: { none: {} } } } } }
        case 'fair_walkin':
            // Walk-ins have no User row — placeholder returns 0 results.
            // The actual list comes from FairStudentPass (see nudgeFairWalkins action).
            return { ...base, id: '__fair_walkin_placeholder__' }
        default: return { ...base }
    }
}
