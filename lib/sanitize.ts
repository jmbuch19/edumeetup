// HTML escape for user-supplied content rendered into email HTML.
// Prevents HTML/script injection when admin inbox renders untrusted input.
//
// IMPORTANT: Use this on every field that originates from a public form
// before interpolating it into an email template.

const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
}

export function escapeHtml(value: string | null | undefined): string {
    if (value === null || value === undefined) return ''
    return String(value).replace(/[&<>"'`=/]/g, ch => HTML_ESCAPE_MAP[ch] ?? ch)
}
