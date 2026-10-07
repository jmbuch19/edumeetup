/**
 * Where each role lands after sign-in. Edge-safe (used by middleware).
 */
export function homePathForRole(role: string | null | undefined): string {
    switch (role) {
        case 'ADMIN': return '/admin/dashboard'
        case 'UNIVERSITY':
        case 'UNIVERSITY_REP': return '/university/dashboard'
        case 'STUDENT': return '/student/dashboard'
        case 'ALUMNI': return '/alumni/dashboard'
        case 'EVENT_PLANNER': return '/fair-ops'
        default: return '/'
    }
}

/** Auth.js session cookie names, including the chunked variants (name.0, name.1, …). */
export function isSessionCookie(name: string): boolean {
    return /^(__Secure-)?authjs\.session-token(\.\d+)?$/.test(name)
}
