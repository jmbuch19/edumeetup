/**
 * lib/file-signature.ts
 * Server-side magic-byte validation.
 * Never trust file.type — it's a client-declared string anyone can spoof.
 * Read the actual bytes and compare against known file signatures.
 */

type MagicCheck = {
    bytes: number[]   // expected bytes at offset
    offset?: number   // default 0
}

const SIGNATURES: Record<string, MagicCheck[]> = {
    'application/pdf': [
        { bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
    ],
    'image/png': [
        { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // ‰PNG\r\n\x1a\n
    ],
    'image/jpeg': [
        { bytes: [0xff, 0xd8, 0xff] }, // JPEG SOI
    ],
    'image/jpg': [
        { bytes: [0xff, 0xd8, 0xff] }, // same as JPEG
    ],
    'image/webp': [
        { bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header — WebP container
        // Note: bytes 8-11 should be "WEBP" but RIFF check is sufficient to block executables
    ],
    'image/gif': [
        { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
        { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
    ],
    // SVG is XML — no reliable magic bytes. Handled separately (see below).
}

/**
 * Returns true if the buffer's magic bytes match the declared mimeType.
 * For SVG, returns true only if the content starts with valid XML/SVG markers.
 * Returns false for any mimeType not in the signature table.
 */
export function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/svg+xml') {
        return validateSVG(buffer)
    }

    const checks = SIGNATURES[mimeType]
    if (!checks) return false // unknown type — reject

    for (const check of checks) {
        const offset = check.offset ?? 0
        const match = check.bytes.every(
            (byte, i) => buffer[offset + i] === byte
        )
        if (match) return true
    }

    return false
}

/**
 * SVG-specific validation:
 * 1. Must start with XML/SVG text markers
 * 2. Must NOT contain <script tags (basic XSS guard)
 *    Full sanitisation requires DOMParser — this is a server-side guard only.
 */
function validateSVG(buffer: Buffer): boolean {
    const text = buffer.subarray(0, 512).toString('utf8').trimStart().toLowerCase()

    const isXMLSVG = text.startsWith('<?xml') || text.startsWith('<svg')
    if (!isXMLSVG) return false

    // Block any SVG containing a <script element — belt-and-suspenders XSS guard
    const full = buffer.toString('utf8').toLowerCase()
    if (full.includes('<script')) return false

    return true
}
