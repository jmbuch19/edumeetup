'use client'

import { useState, useRef, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'

const CAPTCHA_SESSION_KEY = 'edumeetup:captcha:verified'

// Simple single-digit math questions — trivial for humans, blocks dumb bots
const QUESTIONS = [
    { q: '3 + 5', a: 8 },
    { q: '9 - 4', a: 5 },
    { q: '6 + 7', a: 13 },
    { q: '15 - 8', a: 7 },
    { q: '4 × 3', a: 12 },
    { q: '2 + 9', a: 11 },
    { q: '17 - 5', a: 12 },
    { q: '7 + 6', a: 13 },
    { q: '14 - 6', a: 8 },
    { q: '5 + 8', a: 13 },
]

function pickQuestion() {
    return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]
}

interface CaptchaGateProps {
    onVerified: () => void
}

export function CaptchaGate({ onVerified }: CaptchaGateProps) {
    const [question] = useState(pickQuestion)
    const [value, setValue] = useState('')
    const [shake, setShake] = useState(false)
    const [attempts, setAttempts] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Auto-focus input
        setTimeout(() => inputRef.current?.focus(), 100)
    }, [])

    function verify() {
        const answer = parseInt(value.trim(), 10)
        if (!isNaN(answer) && answer === question.a) {
            sessionStorage.setItem(CAPTCHA_SESSION_KEY, '1')
            onVerified()
        } else {
            setShake(true)
            setAttempts(a => a + 1)
            setValue('')
            setTimeout(() => setShake(false), 500)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    function handleKey(e: React.KeyboardEvent) {
        if (e.key === 'Enter') verify()
    }

    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)' }}>
            <div className="mx-4 rounded-2xl bg-white p-6 shadow-2xl max-w-xs w-full text-center">

                {/* Icon */}
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                    <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>

                <h3 className="text-sm font-semibold text-slate-700 mb-1">Quick check ✌️</h3>
                <p className="text-xs text-slate-400 mb-4">Just making sure you're human — takes 2 seconds!</p>

                {/* Question */}
                <div className="mb-3 rounded-xl bg-indigo-50 py-3 px-4">
                    <span className="text-lg font-bold text-indigo-700">
                        What is {question.q} = ?
                    </span>
                </div>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="number"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Your answer"
                    className={`w-full rounded-xl border px-4 py-2.5 text-center text-base font-semibold outline-none transition-all mb-3
                        ${shake ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
                    style={shake ? { animation: 'shake 0.4s ease-in-out' } : {}}
                />

                {attempts > 0 && (
                    <p className="text-xs text-red-400 mb-3">Not quite — give it another try! 😊</p>
                )}

                <button
                    onClick={verify}
                    disabled={!value.trim()}
                    className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors"
                >
                    Start chatting →
                </button>

                <style jsx>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20% { transform: translateX(-6px); }
                        40% { transform: translateX(6px); }
                        60% { transform: translateX(-4px); }
                        80% { transform: translateX(4px); }
                    }
                `}</style>
            </div>
        </div>
    )
}

/** Returns true if the current session has already solved the captcha */
export function isCaptchaVerified(): boolean {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(CAPTCHA_SESSION_KEY) === '1'
}
