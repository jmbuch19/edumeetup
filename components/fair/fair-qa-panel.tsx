'use client'

/**
 * FairQAPanel — shows public answered Qs, lets logged-in users ask new Qs.
 * Used on /fair?eventId=... (below the registration form).
 *
 * Props are plain objects (serialised from server before passing to client).
 */

import { useState, useTransition } from 'react'
import { createFairQuestion } from '@/app/(admin)/admin/fairs/actions'
import { MessageCircleQuestion, ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react'

export interface QAItem {
    id: string
    question: string
    askerRole: string
    answer: string | null
    answeredAt: string | null
    createdAt: string
}

interface Props {
    fairEventId: string
    questions: QAItem[]
    isLoggedIn: boolean
}

export function FairQAPanel({ fairEventId, questions, isLoggedIn }: Props) {
    const answered = questions.filter(q => q.answer)
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
    const [errMsg, setErrMsg] = useState('')
    const [pending, start] = useTransition()

    const handleSubmit = () => {
        if (!text.trim()) return
        setStatus('idle')
        start(async () => {
            const res = await createFairQuestion(fairEventId, text)
            if (res.ok) {
                setText('')
                setStatus('ok')
            } else {
                setErrMsg(res.error)
                setStatus('err')
            }
        })
    }

    // Nothing to show and user not logged in — hide entirely
    if (answered.length === 0 && !isLoggedIn) return null

    return (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Header — collapsible toggle */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <MessageCircleQuestion className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-gray-800">
                        Questions &amp; Answers
                    </span>
                    {answered.length > 0 && (
                        <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {answered.length} answered
                        </span>
                    )}
                </div>
                {open
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
            </button>

            {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {/* Answered questions — public */}
                    {answered.length > 0 && (
                        <div className="px-5 py-4 space-y-4">
                            {answered.map(q => (
                                <div key={q.id}>
                                    <p className="text-sm font-medium text-gray-800 flex items-start gap-2">
                                        <span className="mt-0.5 text-indigo-400">Q</span>
                                        {q.question}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1 flex items-start gap-2">
                                        <span className="mt-0.5 text-emerald-500 font-bold">A</span>
                                        {q.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Ask form — only for logged-in users */}
                    {isLoggedIn && (
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Ask a question
                            </p>

                            {status === 'ok' ? (
                                <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-4 py-3">
                                    ✅ Your question was submitted! We&apos;ll answer it soon and it
                                    will appear here publicly.
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        value={text}
                                        onChange={e => { setText(e.target.value); setStatus('idle') }}
                                        placeholder="e.g. Will there be on-site visa counselling at the fair?"
                                        rows={3}
                                        maxLength={500}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 resize-none"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">{text.length}/500</span>
                                        {status === 'err' && (
                                            <span className="text-xs text-red-500">{errMsg}</span>
                                        )}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={pending || text.trim().length < 5}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 transition-colors"
                                        >
                                            {pending
                                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                                                : <><Send className="w-4 h-4" /> Submit</>
                                            }
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Not logged in prompt */}
                    {!isLoggedIn && answered.length > 0 && (
                        <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500 text-center">
                            <a href="/login" className="text-indigo-600 underline font-medium">Sign in</a> to ask a question
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
