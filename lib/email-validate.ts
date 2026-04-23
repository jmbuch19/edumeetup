// Check whether the email's domain actually has mail servers.
// Gibberish domains like "foo@asdfqwerty.com" fail this check because
// no MX records exist — a free, network-level filter for fake emails.
//
// The dns module is imported lazily so a bundler hiccup with the
// 'node:' protocol (seen on some serverless runtimes) can't cascade
// and break the whole server-actions module at load time.
// Returns true when uncertain so a DNS hiccup doesn't block real users.
export async function hasMxRecord(email: string): Promise<boolean> {
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) return false

    try {
        const dns = await import('dns/promises')
        const records = await dns.resolveMx(domain)
        return Array.isArray(records) && records.length > 0
    } catch (err: unknown) {
        const code = (err as { code?: string })?.code
        if (code === 'ENOTFOUND' || code === 'ENODATA') return false
        console.warn('[email-validate] MX lookup transient failure:', code)
        return true
    }
}
