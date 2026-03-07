/**
 * lib/outreach-utils.ts
 *
 * Pure sync helpers for the Proactive Outreach feature.
 * Kept separate from 'use server' files because Next.js 14 requires
 * every export in a 'use server' module to be an async function.
 */

export function maskName(fullName: string | null | undefined): string {
    if (!fullName) return 'A student'
    const parts = fullName.trim().split(' ')
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function maskScore(
    score: string | null | undefined,
    type: string | null | undefined
): string {
    if (!score || !type) return ''
    const num = parseFloat(score)
    if (isNaN(num)) return `${type} ${score}`
    if (type.toUpperCase().includes('IELTS') || type.toUpperCase().includes('TOEFL')) {
        const rounded = Math.round(num * 2) / 2
        return `${type} ~${rounded}`
    }
    const rounded = Math.round(num / 10) * 10
    return `${type} ~${rounded}`
}
