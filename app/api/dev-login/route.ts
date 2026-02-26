import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ⚠️  DEVELOPMENT ONLY — disabled in production
// GET /api/dev-login  → HTML page with one-click buttons that POST to NextAuth credentials

const DEMO_ACCOUNTS = [
    { label: 'Admin', email: 'admin@edumeetup.com', emoji: '🔐' },
    { label: 'University Admin', email: 'demo@harvard.edu', emoji: '🏛️' },
]

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
    }

    const baseUrl = req.nextUrl.origin || 'http://localhost:3000'

    // Fetch CSRF token from NextAuth (required for credentials POSTs)
    let csrfToken = ''
    try {
        const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`)
        const csrfData = await csrfRes.json()
        csrfToken = csrfData.csrfToken ?? ''
    } catch {
        console.warn('[dev-login] Could not fetch CSRF token')
    }

    // Resolve redirect URLs for each demo account
    const accountsWithRedirects = await Promise.all(
        DEMO_ACCOUNTS.map(async (a) => {
            const user = await prisma.user.findUnique({
                where: { email: a.email },
                select: { role: true }
            })
            const redirectTo = !user ? '/student/dashboard'
                : user.role === 'ADMIN' ? '/admin/dashboard'
                    : user.role === 'UNIVERSITY' || user.role === 'UNIVERSITY_REP' ? '/university/dashboard'
                        : '/student/dashboard'
            return { ...a, redirectTo, found: !!user }
        })
    )

    const buttons = accountsWithRedirects.map(a => `
    <form method="POST" action="/api/auth/callback/credentials">
      <input type="hidden" name="csrfToken" value="${csrfToken}" />
      <input type="hidden" name="email" value="${a.email}" />
      <input type="hidden" name="callbackUrl" value="${a.redirectTo}" />
      <button type="submit" class="btn" ${!a.found ? 'disabled style="opacity:0.4"' : ''}>
        <span class="emoji">${a.emoji}</span>
        <span class="info">
          <strong>${a.label}</strong>
          <small>${a.email}${!a.found ? ' (not in DB)' : ''}</small>
        </span>
        <span class="arrow">→</span>
      </button>
    </form>`).join('')

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
      background: #0f0f13; color: #e2e8f0; min-height: 100vh;
      display: flex; align-items: center; justify-content: center; padding: 2rem;
    }
    .card {
      background: #1a1a2e; border: 1px solid #2d2d4e; border-radius: 16px;
      padding: 2.5rem 2rem; width: 100%; max-width: 440px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block; background: #7c3aed22; color: #a78bfa;
      border: 1px solid #7c3aed55; border-radius: 6px; font-size: 0.7rem;
      font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 3px 10px; margin-bottom: 1.2rem;
    }
    h1 { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.4rem; }
    p  { font-size: 0.85rem; color: #94a3b8; margin-bottom: 2rem; }
    form { margin-bottom: 0.75rem; }
    .btn {
      width: 100%; display: flex; align-items: center; gap: 1rem; background: #1e1e38;
      border: 1px solid #3b3b5e; border-radius: 12px; padding: 1rem 1.25rem;
      color: #e2e8f0; cursor: pointer; transition: all 0.2s ease; text-align: left;
    }
    .btn:hover { background: #2d2d50; border-color: #6366f1; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(99,102,241,0.2); }
    .emoji { font-size: 1.6rem; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .info strong { font-size: 0.95rem; }
    .info small { font-size: 0.75rem; color: #64748b; }
    .arrow { color: #6366f1; font-size: 1.1rem; }
    .note {
      margin-top: 1.5rem; padding: 0.75rem 1rem; background: #10b98111;
      border: 1px solid #10b98133; border-radius: 8px; font-size: 0.78rem;
      color: #34d399; text-align: center;
    }
    .custom { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #2d2d4e; }
    .custom p { margin-bottom: 0.75rem; font-size: 0.8rem; }
    .custom .row { display: flex; gap: 0.5rem; }
    .custom input {
      flex: 1; background: #0f0f1a; border: 1px solid #2d2d4e; border-radius: 8px;
      padding: 0.6rem 0.85rem; color: #e2e8f0; font-size: 0.85rem; outline: none;
    }
    .custom input:focus { border-color: #6366f1; }
    .custom button {
      background: #4f46e5; color: white; border: none; border-radius: 8px;
      padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
    }
    .custom button:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">⚠️ Dev Only</div>
    <h1>Quick Login</h1>
    <p>One-click login — uses real NextAuth session. No email required.</p>
    ${buttons}
    <div class="note">⚡ Logs in instantly via NextAuth Credentials provider (dev only).</div>
    <div class="custom">
      <p>Login as any other user by email:</p>
      <form method="POST" action="/api/auth/callback/credentials">
        <input type="hidden" name="csrfToken" value="${csrfToken}" />
        <input type="hidden" name="callbackUrl" value="/student/dashboard" />
        <div class="row">
          <input name="email" type="email" placeholder="user@example.com" required />
          <button type="submit">Go →</button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
    })
}
