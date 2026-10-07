/**
 * Decides whether a path belongs to a logged-in dashboard (which draws its own
 * chrome) or to the public site (which gets the shared header/footer/concierge).
 *
 * Matches whole path segments: '/universities' and '/university-login' are
 * public even though they share a prefix with '/university'.
 */

const DASHBOARD_SECTIONS = ['/university', '/student', '/admin']

// Public pages that live under a dashboard section
const PUBLIC_EXCEPTIONS = ['/student/register', '/university/register']

function matchesSegment(pathname: string, base: string): boolean {
    return pathname === base || pathname.startsWith(base + '/')
}

export function isDashboardPath(pathname: string | null | undefined): boolean {
    if (!pathname) return false
    if (PUBLIC_EXCEPTIONS.some(p => matchesSegment(pathname, p))) return false
    return DASHBOARD_SECTIONS.some(p => matchesSegment(pathname, p))
}
