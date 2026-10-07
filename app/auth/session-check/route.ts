import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { homePathForRole, isSessionCookie } from '@/lib/role-home'
import { safeRedirect } from '@/lib/safe-redirect'

/**
 * Middleware sends logged-in visitors of /login here instead of straight to
 * their dashboard, because middleware can only decode the JWT, not tell
 * whether the jwt callback has since invalidated it (deactivated user,
 * sessionVersion bump, 30-day absolute cap). Without this check a dead
 * session loops: layout auth() → null → /login → middleware → dashboard → …
 *
 * - Session still valid  → go to the role's dashboard (or callbackUrl).
 * - Session invalidated  → delete the stale cookie and show /login.
 *
 * It never clears a valid session, so it can't be used to log someone out.
 */
export async function GET(req: NextRequest) {
    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl')
    const session = await auth()

    if (session?.user) {
        const dest = callbackUrl
            ? safeRedirect(callbackUrl, homePathForRole(session.user.role))
            : homePathForRole(session.user.role)
        return NextResponse.redirect(new URL(dest, req.nextUrl))
    }

    const login = new URL('/login', req.nextUrl)
    if (callbackUrl) login.searchParams.set('callbackUrl', callbackUrl)
    const res = NextResponse.redirect(login)
    for (const { name } of req.cookies.getAll()) {
        if (isSessionCookie(name)) {
            res.cookies.set(name, '', {
                path: '/',
                maxAge: 0,
                httpOnly: true,
                sameSite: 'lax',
                secure: name.startsWith('__Secure-'),
            })
        }
    }
    return res
}
