import { randomBytes, createHash } from 'crypto'
import { prisma } from './prisma'
import { Resend } from 'resend'

// Lazily initialised — avoids crash on import when RESEND_API_KEY is absent (local dev)
let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}
const brandColor = "#4F46E5"

function buildEmailHtml(url: string, isUniversity = false): string {
  // Wrap the real callback URL in /auth/confirm so Gmail/Yahoo link scanners
  // hit the harmless confirm page rather than consuming the single-use token.
  const baseUrl = (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://edumeetup.com').replace(/\/$/, '')
  const confirmUrl = `${baseUrl}/auth/confirm?url=${encodeURIComponent(url)}`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { font-size: 24px; font-weight: bold; letter-spacing: -0.5px; margin-bottom: 30px; }
    .logo span { color: ${brandColor}; }
    .button { display: inline-block; padding: 12px 24px; background: ${brandColor}; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>edU</span>meetup</div>
    <h1>Sign in to ${isUniversity ? 'University Portal' : 'edUmeetup'}</h1>
    <p>Click the button below to sign in. This link is valid for <strong>15 minutes</strong> and can only be used once.</p>
    <a href="${confirmUrl}" class="button" target="_blank">Sign in to edUmeetup</a>
    <p style="font-size:14px;color:#6b7280;margin-top:20px;">If you did not request this email, you can safely ignore it.</p>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} IAES (International Academic &amp; Education Services). All rights reserved.</p>
      <p>EduMeetup is an initiative by IAES.</p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Sends a magic link email by:
 * 1. Creating a VerificationToken in DB (hashed the same way Auth.js expects)
 * 2. Sending the email directly via Resend
 *
 * This bypasses Auth.js signIn("email") which silently fails in Netlify serverless.
 * Auth.js hashes tokens as SHA256(token + secret) before storing in DB.
 * The URL contains the plain token; Auth.js hashes it on callback to verify.
 */
export async function sendMagicLink(email: string, redirectTo: string): Promise<void> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  const baseUrl = (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://edumeetup.com').replace(/\/$/, '')

  // 1. Generate random plain token
  const plainToken = randomBytes(32).toString('hex')

  // 2. Hash using the same algorithm Auth.js uses: SHA256(token + secret)
  const hashedToken = createHash('sha256')
    .update(`${plainToken}${secret}`)
    .digest('hex')

  // 3. Clean up expired/old tokens, then store new one
  await prisma.verificationToken.deleteMany({
    where: { identifier: email }
  })
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    }
  })

  // 4. Build the magic link URL (same format Auth.js expects)
  const params = new URLSearchParams({
    callbackUrl: redirectTo,
    token: plainToken,
    email,
  })
  const magicLinkUrl = `${baseUrl}/api/auth/callback/email?${params.toString()}`

  console.log(`[MAGIC LINK] Generated for ${email} → ${baseUrl}/api/auth/callback/email?...`)

  // 5. Send via Resend
  const isUniversity = redirectTo.includes('university')
  const subject = isUniversity
    ? 'Your edUmeetup university portal sign-in link'
    : 'Your edUmeetup sign-in link'

  const { error } = await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? 'EduMeetup <noreply@edumeetup.com>',
    to: email,
    subject,
    html: buildEmailHtml(magicLinkUrl, isUniversity),
  })

  if (error) {
    console.error('[MAGIC LINK] Resend error:', error)
    throw new Error(`Resend failed: ${(error as any).message ?? JSON.stringify(error)}`)
  }

  console.log(`[MAGIC LINK] Email sent successfully to ${email}`)
}
