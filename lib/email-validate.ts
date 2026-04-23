import { resolveMx } from 'node:dns/promises'

// Check whether the email's domain actually has mail servers.
// Gibberish domains like "foo@asdfqwerty.com" fail this check because
// no MX records exist — a free, network-level filter for fake emails.
//
// Runs on Node.js server actions; not usable in Edge runtime.
// Returns true when uncertain (DNS error) so a temporary resolver hiccup
// doesn't block legitimate users.
export async function hasMxRecord(email: string): Promise<boolean> {
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) return false

    try {
        const records = await resolveMx(domain)
        return Array.isArray(records) && records.length > 0
    } catch (err: unknown) {
        const code = (err as { code?: string })?.code
        // Authoritative "no such domain" or "no mail exchanger" — reject.
        if (code === 'ENOTFOUND' || code === 'ENODATA') return false
        // Transient failure (timeout, SERVFAIL) — be lenient, don't block users.
        console.warn('[email-validate] MX lookup transient failure:', code)
        return true
    }
}
