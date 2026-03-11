'use client'

import { useEffect, useState } from 'react'
import { getStudentCount } from '@/app/actions/student-count'

/**
 * SocialProofBubble
 *
 * Floating bottom-right widget on the student profile page.
 * Fetches the REAL student count via server action — no fake numbers.
 *
 * Design: dark glass card (sapphire bg), gold pill tag, Fraunces serif headline,
 *         green live pulse dot.
 *
 * Message tiers:
 *   0–99    → "Founding Member" — personal founding explorer message
 *   100–499 → "100+ Students" — growing community message
 *   500+    → real formatted count (1.4k style)
 */

const EARLY_TIER = 100

function formatCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return `${n}+`
}

type ProofContent = {
    tag: string
    headline: string
    body: string
    isFounder: boolean
}

function getProof(count: number): ProofContent {
    if (count < EARLY_TIER) {
        return {
            tag: 'FOUNDING MEMBER',
            headline: 'Hey — you propel our confidence.',
            body: "You're one of the very first students on edUmeetup. Our platform exists because of explorers like you. Thank you for being here.",
            isFounder: true,
        }
    }
    if (count < 500) {
        return {
            tag: 'GROWING FAST',
            headline: `${formatCount(count)} students have found their path.`,
            body: 'Join a growing community of students connecting directly with verified universities — no agents, no fees.',
            isFounder: false,
        }
    }
    return {
        tag: 'VERIFIED COUNT',
        headline: `${formatCount(count)} students already here.`,
        body: 'Welcome to join the explorers. Every one of them connected directly with international universities — no middlemen, no commission.',
        isFounder: false,
    }
}

export function SocialProofBubble() {
    const [count, setCount] = useState<number | null>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        getStudentCount().then(n => {
            setCount(n)
            setTimeout(() => setVisible(true), 700)
        })
    }, [])

    if (count === null) {
        // Skeleton while loading
        return (
            <div className={`fixed bottom-6 right-6 z-50 w-64 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div style={{ background: 'oklch(37.9% 0.146 265.522)', borderRadius: 20, padding: '22px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'oklch(72% 0.17 65)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Loading live count…</span>
                    </div>
                </div>
            </div>
        )
    }

    const proof = getProof(count)

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 w-[272px] transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            role="status"
            aria-live="polite"
        >
            <div
                style={{
                    background: 'oklch(37.9% 0.146 265.522)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '22px 24px',
                    boxShadow: '0 8px 32px oklch(37.9% 0.146 265.522 / 0.45), 0 2px 8px oklch(37.9% 0.146 265.522 / 0.2)',
                }}
            >
                {/* Gold pill tag */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'oklch(72% 0.17 65)', borderRadius: 100, padding: '3px 12px', marginBottom: 14 }}>
                    <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'oklch(37.9% 0.146 265.522)', animation: 'pulse 1.8s ease-in-out infinite' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'oklch(37.9% 0.146 265.522)', letterSpacing: '0.8px', fontFamily: 'var(--font-jakarta, system-ui)' }}>
                        {proof.tag}
                    </span>
                </div>

                {/* Headline — Fraunces serif */}
                <div
                    style={{
                        fontFamily: 'var(--font-fraunces, Georgia, serif)',
                        fontSize: 19,
                        fontWeight: 600,
                        color: '#fff',
                        lineHeight: 1.3,
                        marginBottom: 10,
                        letterSpacing: '-0.3px',
                    }}
                >
                    {proof.headline}
                </div>

                {/* Body */}
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, marginBottom: 18, fontWeight: 300, fontFamily: 'var(--font-jakarta, system-ui)' }}>
                    {proof.body}
                </p>

                {/* Live indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#4ade80' }} />
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#4ade80' }} />
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500, letterSpacing: '0.3px', fontFamily: 'var(--font-jakarta, system-ui)' }}>
                        {count !== null ? 'Live count · updates in real time' : 'Fetching count…'}
                    </span>
                </div>
            </div>
        </div>
    )
}
