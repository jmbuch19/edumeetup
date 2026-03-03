'use client'

import { useState, useTransition } from 'react'
import { sendSegmentNudge } from './actions'
import type { FilterPreset, StudentFilter } from '@/lib/admin/student-filters'

export function NudgePanel({ filter, preset }: { filter: StudentFilter; preset: FilterPreset }) {
    const [title, setTitle] = useState(`A message from EdUmeetup`)
    const [message, setMessage] = useState(preset.nudgeTemplate || '')
    const [sendEmail, setSendEmail] = useState(true)
    const [result, setResult] = useState<string>('')
    const [isPending, startTransition] = useTransition()

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
