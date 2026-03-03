'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bell, Loader2, Mail } from 'lucide-react'
import { sendSegmentNudge } from './actions'
import type { FilterPreset, StudentFilter } from '@/lib/admin/student-filters'

interface NudgePanelProps {
    filter: StudentFilter
    preset: FilterPreset
}

export function NudgePanel({ filter, preset }: NudgePanelProps) {
    const [open, setOpen] = useState(false)
    const [useCustom, setUseCustom] = useState(false)
    const [customTitle, setCustomTitle] = useState('')
    const [customMsg, setCustomMsg] = useState('')
    const [sendEmailAlso, setSendEmailAlso] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{ count?: number } | null>(null)

    function handleSend() {
        const fd = new FormData()
        fd.set('filter', filter)
        fd.set('title', useCustom ? customTitle : `EdUmeetup — ${preset.label}`)
        fd.set('message', useCustom ? customMsg : preset.nudgeTemplate!)
        fd.set('sendEmail', sendEmailAlso ? 'true' : 'false')

        startTransition(async () => {
            const res = await sendSegmentNudge(fd)
            if ('error' in res && res.error) {
                toast.error(res.error)
            } else if ('recipientCount' in res) {
                toast.success(`Sent to ${res.recipientCount} student${res.recipientCount !== 1 ? 's' : ''}`)
                setResult({ count: res.recipientCount })
                setOpen(false)
            }
        })
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all"
            >
                <Bell className="h-3 w-3" />
                {result ? `Sent ✓ (${result.count})` : `Nudge this group 📣`}
            </button>
        )
    }

    return (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
            <p className="text-sm font-semibold text-indigo-800">
                📣 Send nudge — <span className="font-normal">{preset.description}</span>
            </p>

            {/* Template / Custom toggle */}
            <div className="flex gap-2">
                {['template', 'custom'].map(m => (
                    <button key={m} onClick={() => setUseCustom(m === 'custom')}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${(m === 'custom') === useCustom
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}>
                        {m === 'template' ? '📝 Use template' : '✏️ Custom message'}
                    </button>
                ))}
            </div>

            {!useCustom ? (
                <p className="text-xs text-indigo-700 bg-white rounded-lg border border-indigo-100 px-3 py-2 leading-relaxed">
                    {preset.nudgeTemplate?.replace(/\{\{name\}\}/g, '<student name>')}
                </p>
            ) : (
                <div className="space-y-2">
                    <input className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white"
                        placeholder="Notification title…" value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)} />
                    <textarea className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white resize-none"
                        rows={3} placeholder="Message… use {{name}} for student's first name"
                        value={customMsg} onChange={e => setCustomMsg(e.target.value)} />
                    <p className="text-xs text-indigo-500">Tip: use <code className="bg-indigo-100 px-1 rounded">{'{{name}}'}</code> — it's replaced with each student's first name.</p>
                </div>
            )}

            {/* Send email toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer w-fit">
                <input type="checkbox" checked={sendEmailAlso} onChange={e => setSendEmailAlso(e.target.checked)}
                    className="rounded border-slate-300" />
                <Mail className="h-3 w-3" /> Also send email (via Resend)
            </label>

            <div className="flex gap-2">
                <Button size="sm" disabled={isPending} onClick={handleSend}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                    {isPending ? 'Sending…' : 'Send Notification'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
        </div>
    )
}
