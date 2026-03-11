'use client'

import { useEffect, useState } from 'react'
import { getStudentCount } from '@/app/actions/student-count'
import { Users, Sparkles, Star } from 'lucide-react'

/**
 * SocialProofBubble
 *
 * Floating bottom-right element shown on the student profile form.
 * Fetches the real student count on mount — NO fake numbers.
 *
 * Visual language:
 *   Primary: oklch(37.9% 0.146 265.522) — deep sapphire blue
 *   Accent:  oklch(80% 0.15 70)          — warm amber/gold
 *   Surface: oklch(97% 0.01 265)         — near-white with cool tint
 *
 * Messaging tiers:
 *   0–99    → "You're growing our confidence" — early founder message
 *   100–999 → "Join X+ explorers"
 *   1000+   → "Join X,XXX+ students" with formatted number
 */

const EARLY_TIER = 100   // first N users get the founder message

function formatCount(n: number): string {
    if (n >= 1000) return (Math.floor(n / 100) * 100).toLocaleString('en-IN') + '+'
    if (n >= 100)  return n + '+'
    return String(n)
}

function getMessage(count: number) {
    if (count < EARLY_TIER) {
        return {
            icon: <Star className="h-4 w-4" />,
            headline: "Hey, you're building our confidence! 🌱",
            sub: "You're among our very first explorers — your profile helps us grow something great.",
            accent: true,
        }
    }
    if (count < 500) {
        return {
            icon: <Sparkles className="h-4 w-4" />,
            headline: `${formatCount(count)} students already here`,
            sub: "Welcome to join the explorers. Your dream school is waiting.",
            accent: false,
        }
    }
    return {
        icon: <Users className="h-4 w-4" />,
        headline: `${formatCount(count)} students trust EdUmeetup`,
        sub: "Build your profile and let top universities discover you.",
        accent: false,
    }
}

export function SocialProofBubble() {
    const [count, setCount] = useState<number | null>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        getStudentCount().then(n => {
            setCount(n)
            setTimeout(() => setVisible(true), 800) // slight delay for polish
        })
    }, [])

    if (count === null) return null

    const msg = getMessage(count)

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 max-w-[280px] transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            role="status"
            aria-live="polite"
        >
            <div
                style={{
                    background: 'oklch(97% 0.01 265)',
                    borderColor: 'oklch(85% 0.04 265)',
                    boxShadow: '0 8px 32px oklch(37.9% 0.146 265.522 / 0.18), 0 2px 8px oklch(37.9% 0.146 265.522 / 0.10)',
                }}
                className="rounded-2xl border p-4 backdrop-blur-sm"
            >
                {/* Icon badge */}
                <div className="flex items-start gap-3">
                    <div
                        style={{ background: msg.accent ? 'oklch(80% 0.15 70)' : 'oklch(37.9% 0.146 265.522)' }}
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                    >
                        {msg.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p
                            style={{ color: 'oklch(37.9% 0.146 265.522)' }}
                            className="text-sm font-bold leading-snug"
                        >
                            {msg.headline}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                            {msg.sub}
                        </p>
                    </div>
                </div>

                {/* Live indicator dot */}
                <div className="mt-3 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span
                            style={{ background: 'oklch(60% 0.14 145)' }}
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        />
                        <span
                            style={{ background: 'oklch(60% 0.14 145)' }}
                            className="relative inline-flex rounded-full h-2 w-2"
                        />
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                        Live count
                    </span>
                </div>
            </div>
        </div>
    )
}
