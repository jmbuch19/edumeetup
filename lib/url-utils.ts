export function normalizeUrl(url: string): string {
    const value = url.trim()
    if (!value) return value

    // Keep root-relative links internal.
    if (value.startsWith('/')) return value

    // If protocol exists (http:, https:, mailto:, tel:, etc), keep it as-is.
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) return value

    // Bare domains like "example.com" would otherwise be treated as
    // relative paths by the browser and cause same-origin 404s.
    return `https://${value}`
}
