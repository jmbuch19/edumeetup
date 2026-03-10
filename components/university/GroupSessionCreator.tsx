'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { createGroupSession, notifyMatchedStudents, type CreateGroupSessionInput } from '@/app/university/actions/group-sessions'
import { useRouter } from 'next/navigation'

const FIELDS = [
    'Computer Science', 'Engineering', 'Business', 'Data Science',
    'Health Sciences', 'Social Sciences', 'Arts & Humanities', 'Law', 'Architecture', 'Others'
]

type AudiencePreview = { tier1Count: number; tier2Count: number; tier3Count: number; totalCount: number }

export default function GroupSessionCreator({
    programs,
    onClose,
}: {
    programs: { id: string; programName: string; fieldCategory: string }[]
    onClose: () => void
}) {
    const router = useRouter()

    const [form, setForm] = useState<CreateGroupSessionInput & { capacity: number }>({
        title: '',
        agenda: '',
        programId: '',
        targetField: '',
        scheduledAt: '',
        durationMinutes: 45,
        capacity: 10,
    })

    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState<AudiencePreview | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [notifying, setNotifying] = useState(false)
    const [notified, setNotified] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const field = (k: keyof typeof form) => ({
        value: form[k] as string | number,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            setForm(prev => ({ ...prev, [k]: k === 'capacity' || k === 'durationMinutes' ? Number(e.target.value) : e.target.value }))
    })

    const handleCreate = async () => {
        if (!form.title || !form.scheduledAt) return
        setLoading(true)
        const res = await createGroupSession(form)
        setLoading(false)

        if (res.error) { alert(res.error); return }

        setSessionId(res.sessionId!)
        setPreview(res.audiencePreview ?? null)
    }

    const handleNotify = async () => {
        if (!sessionId) return
        setNotifying(true)
        const res = await notifyMatchedStudents(sessionId)
        setNotifying(false)
        if (res.error) alert(res.error)
        else { setNotified(true); router.refresh() }
    }

    const handleDone = () => {
        router.refresh()
        onClose()
    }

    // ── After creation — show audience preview & notify step ────────────
    if (sessionId) {
        return (
            <div className="space-y-5">
                <div className="flex items-center gap-3 text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">
                    <Users className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Session created!</p>
                        <p className="text-sm">Now notify the students who match this session.</p>
                    </div>
                </div>

                {preview && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-blue-900">Audience Preview — {preview.totalCount} students match</h4>
                        {[
                            { tier: 'Tier 1', label: 'Directly interested in this program', count: preview.tier1Count, color: 'text-blue-800' },
                            { tier: 'Tier 2', label: 'Match by field of study', count: preview.tier2Count, color: 'text-blue-700' },
                            { tier: 'Tier 3', label: 'General interest match', count: preview.tier3Count, color: 'text-blue-600' },
                        ].map(({ tier, label, count, color }) => (
                            <div key={tier} className="flex items-center gap-2 text-sm">
                                <span className={`font-semibold w-14 shrink-0 ${color}`}>{tier}</span>
                                <span className="text-gray-600 flex-1">{label}</span>
                                <span className="font-bold text-gray-900">{count}</span>
                            </div>
                        ))}
                        <p className="text-xs text-blue-600 mt-2">Tier 1 students will be notified first — they&apos;re the warmest leads.</p>
                    </div>
                )}

                <div className="flex gap-3">
                    {!notified ? (
                        <Button className="gap-2" disabled={notifying} onClick={handleNotify}>
                            {notifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {notifying ? 'Notifying…' : `Notify All ${preview?.totalCount ?? ''} Students`}
                        </Button>
                    ) : (
                        <span className="text-sm text-green-700 font-medium flex items-center gap-1.5">
                            ✓ Notifications sent
                        </span>
                    )}
                    <Button variant="ghost" onClick={handleDone}>
                        {notified ? 'Done' : 'Skip & Notify Later'}
                    </Button>
                </div>
            </div>
        )
    }

    // ── Creation form ─────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Session Title <span className="text-red-500">*</span></label>
                <input
                    {...field('title')}
                    placeholder="e.g. USC Viterbi CS Admissions Q&A"
                    className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Date & Time <span className="text-red-500">*</span></label>
                <input
                    type="datetime-local"
                    {...field('scheduledAt')}
                    className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Agenda / Topic</label>
                <textarea
                    value={form.agenda}
                    onChange={e => setForm(prev => ({ ...prev, agenda: e.target.value }))}
                    placeholder="What will you cover? e.g. Program overview, scholarships, Q&A…"
                    rows={2}
                    className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none resize-none"
                />
            </div>

            {/* Advanced options */}
            <button
                type="button"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setShowAdvanced(v => !v)}
            >
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Advanced options (targeting, capacity, duration)
            </button>

            {showAdvanced && (
                <div className="space-y-3 border-t pt-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Seats (max 10)</label>
                            <input
                                type="number"
                                min={2} max={10}
                                {...field('capacity')}
                                className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Duration (min)</label>
                            <select {...field('durationMinutes')} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                                {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} minutes</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Target Program <span className="text-gray-400">(for smart matching)</span></label>
                        <select {...field('programId')} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                            <option value="">— No specific program —</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.programName}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Target Field <span className="text-gray-400">(broader matching)</span></label>
                        <select {...field('targetField')} className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                            <option value="">— Any field —</option>
                            {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <Button disabled={!form.title || !form.scheduledAt || loading} onClick={handleCreate} className="gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    {loading ? 'Creating…' : 'Create Session'}
                </Button>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
        </div>
    )
}
