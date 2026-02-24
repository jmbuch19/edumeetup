import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes, createHash } from 'crypto'

// ⚠️  DEVELOPMENT ONLY — disabled in production
// Visit /api/dev-login            → HTML page with one-click demo logins
// Visit /api/dev-login?email=x   → JSON with magic link (for scripting)

const DEMO_ACCOUNTS = [
    { label: 'University Admin', email: 'demo@harvard.edu', emoji: '🏛️' },
]

async function buildMagicLink(email: string, baseUrl: string, secret: string) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null

    const redirectTo =
        user.role === 'UNIVERSITY' ? '/university/dashboard'
            : user.role === 'ADMIN' ? '/admin/dashboard'
                : '/student/dashboard'

    const plainToken = randomBytes(32).toString('hex')
    const hashedToken = createHash('sha256').update(`${plainToken}${secret}`).digest('hex')

    await prisma.verificationToken.deleteMany({ where: { identifier: email } })
    await prisma.verificationToken.create({
        data: {
            identifier: email,
            token: hashedToken,
            expires: new Date(Date.now() + 15 * 60 * 1000),
        }
    })

    const params = new URLSearchParams({ callbackUrl: redirectTo, token: plainToken, email })
    return {
        url: `${baseUrl}/api/auth/callback/email?${params.toString()}`,
        role: user.role,
        redirectTo,
    }
}

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
    }

    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? ''
    const baseUrl = req.nextUrl.origin || 'http://localhost:3000'
    const email = req.nextUrl.searchParams.get('email')

    // ── JSON mode (for scripting / curl) ──────────────────────────────────
    if (email) {
        const result = await buildMagicLink(email, baseUrl, secret)
        if (!result) {
            return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 })
        }
        return NextResponse.json({
            email,
            role: result.role,
            redirectTo: result.redirectTo,
            magicLink: result.url,
            note: 'Click magicLink or open it in a browser to log in. Expires in 15 minutes.',
        })
    }

    // ── HTML mode (browser landing page) ──────────────────────────────────
    // Generate links for all demo accounts
    const links: { label: string; email: string; emoji: string; url: string; role: string }[] = []
    for (const account of DEMO_ACCOUNTS) {
        const result = await buildMagicLink(account.email, baseUrl, secret)
        if (result) {
            links.push({ ...account, url: result.url, role: result.role })
        }
    }

    const buttons = links.map(l => `
        <a href="${l.url}" class="btn">
            <span class="emoji">${l.emoji}</span>
            <span class="info">
                <strong>${l.label}</strong>
                <small>${l.email}</small>
            </span>
            <span class="arrow">→</span>
        </a>`).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dev Login — EduMeetup</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f13;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #1a1a2e;
      border: 1px solid #2d2d4e;
      border-radius: 16px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      background: #7c3aed22;
      color: #a78bfa;
      border: 1px solid #7c3aed55;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 10px;
      margin-bottom: 1.2rem;
    }
    h1 { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.4rem; }
    p  { font-size: 0.85rem; color: #94a3b8; margin-bottom: 2rem; }
    .btn {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #1e1e38;
      border: 1px solid #3b3b5e;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      text-decoration: none;
      color: #e2e8f0;
      transition: all 0.2s ease;
      margin-bottom: 0.75rem;
    }
    .btn:hover {
      background: #2d2d50;
      border-color: #6366f1;
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(99,102,241,0.2);
    }
    .emoji { font-size: 1.6rem; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .info strong { font-size: 0.95rem; }
    .info small { font-size: 0.75rem; color: #64748b; }
    .arrow { color: #6366f1; font-size: 1.1rem; }
    .note {
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      background: #f59e0b11;
      border: 1px solid #f59e0b33;
      border-radius: 8px;
      font-size: 0.78rem;
      color: #fbbf24;
      text-align: center;
    }
    .custom {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #2d2d4e;
    }
    .custom p { margin-bottom: 0.75rem; font-size: 0.8rem; }
    .custom form { display: flex; gap: 0.5rem; }
    .custom input {
      flex: 1;
      background: #0f0f1a;
      border: 1px solid #2d2d4e;
      border-radius: 8px;
      padding: 0.6rem 0.85rem;
      color: #e2e8f0;
      font-size: 0.85rem;
      outline: none;
    }
    .custom input:focus { border-color: #6366f1; }
    .custom button {
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .custom button:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">⚠️ Dev Only</div>
    <h1>Quick Login</h1>
    <p>One-click login for demo accounts. Links expire after 15 minutes.</p>
    ${buttons}
    <div class="note">⏱ Each link is single-use and expires in 15 min. Refresh this page to get a new one.</div>
    <div class="custom">
      <p>Login as any other user by email:</p>
      <form onsubmit="event.preventDefault(); window.location.href='/api/dev-login?email=' + encodeURIComponent(this.email.value)">
        <input name="email" type="email" placeholder="user@example.com" required />
        <button type="submit">Go →</button>
      </form>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
    })
}

