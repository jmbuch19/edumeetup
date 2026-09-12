import { timingSafeEqual } from 'crypto'

/**
 * Constant-time Bearer token comparison for high-privilege operational routes.
 * Missing/empty secrets always fail closed.
 */
export function hasValidBearerSecret(header: string | null, expected: string | undefined): boolean {
    if (!expected || !header?.startsWith('Bearer ')) return false

    const provided = header.slice('Bearer '.length).trim()
    if (!provided) return false

    const providedBuffer = Buffer.from(provided, 'utf8')
    const expectedBuffer = Buffer.from(expected, 'utf8')

    return providedBuffer.length === expectedBuffer.length
        && timingSafeEqual(providedBuffer, expectedBuffer)
}
