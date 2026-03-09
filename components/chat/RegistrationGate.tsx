'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Clock, ArrowRight } from 'lucide-react'

interface RegistrationGateProps {
    reason: 'anon_limit' | 'anon_cooldown' | 'registered_limit'
    visitNumber?: number
    cooldownEndsAt?: number
    onDismiss: () => void
}

function useCooldownTimer(endsAt?: number) {
    const [remaining, setRemaining] = useState('')

    useEffect(() => {
        if (!endsAt) return
        const update = () => {
            const diff = endsAt - Date.now()
            if (diff <= 0) { setRemaining(''); return }
            const h = Math.floor(diff / 3600000)
            const m = Math.floor((diff % 3600000) / 60000)
            setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m`)
        }
        update()
        const t = setInterval(update, 60000)
        return () => clearInterval(t)
    }, [endsAt])

    return remaining
}

const VISIT_MESSAGES = [
    { headline: 'Enjoying the chat? 🎓', sub: 'Register free to keep the conversation going — plus get personalised university recommendations saved to your profile.' },
    { headline: 'Welcome back! 👋', sub: 'Register now to continue — registered students get 50 messages per day and personalised university matches.' },
    { headline: 'One last step ✨', sub: 'Create your free profile to unlock the bot and get direct access to verified university reps on EdUmeetup.' },
]

export function RegistrationGate({ reason, visitNumber = 0, cooldownEndsAt, onDismiss }: RegistrationGateProps) {
    const timer = useCooldownTimer(cooldownEndsAt)
    const visit = VISIT_MESSAGES[Math.min(visitNumber, VISIT_MESSAGES.length - 1)]

    const isCooldown = reason === 'anon_cooldown' || reason === 'registered_limit'
    const isRegistered = reason === 'registered_limit'

    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)' }}>
            <div className="mx-4 rounded-2xl bg-white p-6 shadow-2xl max-w-xs w-full text-center">

                {/* Icon */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                    {isCooldown
                        ? <Clock className="h-7 w-7 text-indigo-500" />
                        : <GraduationCap className="h-7 w-7 text-indigo-500" />}
                </div>

                {/* Heading */}
                {isCooldown ? (
                    <>
                        <h3 className="text-base font-semibold text-slate-800 mb-1">
                            {isRegistered ? "You've hit your daily limit 😊" : "See you soon! 👋"}
                        </h3>
                        <p className="text-sm text-slate-500 mb-3">
                            {isRegistered
                                ? 'You\'ve used all 50 messages for today. Check back in 48 hours — or upgrade to Premium for unlimited access.'
                                : 'Come back once your cooldown ends or register now to continue immediately.'}
                        </p>
                        {timer && (
                            <div className="mb-4 rounded-lg bg-indigo-50 py-2 px-3 text-sm font-medium text-indigo-700">
                                ⏰ Available again in {timer}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <h3 className="text-base font-semibold text-slate-800 mb-1">{visit.headline}</h3>
                        <p className="text-sm text-slate-500 mb-4">{visit.sub}</p>
                    </>
                )}

                {/* CTAs */}
                {!isRegistered && (
                    <a
                        href="/student/register"
                        className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors mb-2"
                    >
                        Register Free <ArrowRight className="h-4 w-4" />
                    </a>
                )}

                <button
                    onClick={onDismiss}
                    className="w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                >
                    {isCooldown ? 'Close' : `Maybe later ${visitNumber >= 1 ? `(${visitNumber >= 2 ? '30-day' : '7-day'} wait)` : '(48h wait)'}`}
                </button>
            </div>
        </div>
    )
}
