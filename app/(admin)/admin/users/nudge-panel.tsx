'use client'

import { useState, useTransition } from 'react'
import { sendSegmentNudge, nudgeFairWalkins } from './actions'
import type { FilterPreset, StudentFilter } from '@/lib/admin/student-filters'

export function NudgePanel({ filter, preset }: { filter: StudentFilter; preset: FilterPreset }) {
    const [title, setTitle] = useState(`A message from EdUmeetup`)
    const [message, setMessage] = useState(preset.nudgeTemplate || '')
    const [ctaUrl, setCtaUrl] = useState(filter === 'fair_walkin' ? '/register' : '/onboarding/student')
    const [sendEmail, setSendEmail] = useState(true)
    const [result, setResult] = useState<string>('')
    const [isPending, startTransition] = useTransition()

    const isWalkin = filter === 'fair_walkin'

    // ── Walk-in nudge — email only ─────────────────────────────────────────────
    if (isWalkin) {
        async function handleWalkinSend() {
            startTransition(async () => {
                const res = await nudgeFairWalkins(message, ctaUrl)
                if ('success' in res && res.success) {
                    setResult(`✅ Sent: ${res.sent} email${res.sent !== 1 ? 's' : ''} (${res.skipped} skipped — no email consent)`)
                } else {
                    setResult(('error' in res && res.error) ? res.error as string : 'Failed')
                }
            })
        }

        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 space-y-3">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-amber-800">
                        ⚠️ Email walk-in registrants
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-medium">
                        Email only — no app account
                    </span>
                </div>
                <p className="text-xs text-amber-700">
                    These users registered at a fair venue but have no edUmeetup account. You can only reach them via email.
                    Only recipients who gave email consent will receive this message.
                </p>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Message body..."
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm resize-none bg-white"
                />
                <input
                    value={ctaUrl}
                    onChange={e => setCtaUrl(e.target.value)}
                    placeholder="CTA URL (e.g. /register)"
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
                <div className="flex items-center justify-between">
                    <p className="text-xs text-amber-600">CTA link will be appended to the email</p>
                    <button
                        onClick={handleWalkinSend}
                        disabled={isPending}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-amber-600 transition-colors"
                    >
                        {isPending ? 'Sending…' : 'Send Email to Walk-ins'}
                    </button>
                </div>
                {result && <p className="text-sm font-medium text-amber-800">{result}</p>}
            </div>
        )
    }

    // ── Standard segment nudge (in-app + optional email) ──────────────────────
    async function handleSend() {
        const fd = new FormData()
        fd.set('filter', filter)
        fd.set('title', title)
        fd.set('message', message)
        fd.set('sendEmail', String(sendEmail))
        startTransition(async () => {
            const res = await sendSegmentNudge(fd)
            if ('success' in res && res.success) {
                const notifPart = `${res.notifCount} notification${res.notifCount !== 1 ? 's' : ''}`
                const emailPart = sendEmail ? ` + ${res.emailCount} email${res.emailCount !== 1 ? 's' : ''}` : ''
                setResult(`✅ Sent: ${notifPart}${emailPart}`)
            } else setResult(('error' in res && res.error) ? res.error : 'Failed')
        })
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">
                Send nudge to this segment
            </p>
            <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Notification title"
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={message} onChange={e => setMessage(e.target.value)}
                rows={3} placeholder="Message — use {{name}} for personalisation"
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm resize-none" />
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-blue-700 cursor-pointer">
                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                    Also send email
                </label>
                <button onClick={handleSend} disabled={isPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-60">
                    {isPending ? 'Sending…' : 'Send Nudge'}
                </button>
            </div>
            {result && <p className="text-sm font-medium text-blue-800">{result}</p>}
        </div>
    )
}
