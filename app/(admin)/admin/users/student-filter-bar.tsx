'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, X } from 'lucide-react'
import { FILTER_PRESETS, StudentFilter } from '@/lib/admin/student-filters'
import { notifyFilteredStudents } from './actions'
import { toast } from 'sonner'

interface StudentFilterBarProps {
    totalCount: number
    filteredStudentIds: string[]
    activeFilter: StudentFilter
}

export function StudentFilterBar({ totalCount, filteredStudentIds, activeFilter }: StudentFilterBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [notifyMode, setNotifyMode] = useState(false)
    const [customTitle, setCustomTitle] = useState('')
    const [customMessage, setCustomMessage] = useState('')
    const [useCustom, setUseCustom] = useState(false)

    const preset = FILTER_PRESETS.find(p => p.id === activeFilter) ?? FILTER_PRESETS[0]
    const hasNudge = !!preset.nudgeTemplate && filteredStudentIds.length > 0

    const setFilter = useCallback((f: StudentFilter) => {
        const params = new URLSearchParams(searchParams.toString())
        if (f === 'ALL') params.delete('filter')
        else params.set('filter', f)
        router.push(`${pathname}?${params.toString()}`)
        setNotifyMode(false)
    }, [router, pathname, searchParams])

    async function handleSend() {
        const title = useCustom ? customTitle : `EdUmeetup — ${preset.label}`
        const message = useCustom
            ? customMessage
            : (preset.nudgeTemplate ?? '').replace(/\{\{name\}\}/g, 'there')

        if (!title || !message) { toast.error('Fill in title and message'); return }

        startTransition(async () => {
            const res = await notifyFilteredStudents(filteredStudentIds, title, message)
            if ('error' in res && res.error) toast.error(res.error)
            else {
                toast.success(`Sent to ${res.count} student${(res.count ?? 0) > 1 ? 's' : ''}`)
                setNotifyMode(false)
            }
        })
    }

    return (
        <div className="space-y-3">
            {/* Preset chips */}
            <div className="flex flex-wrap gap-2">
                {FILTER_PRESETS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setFilter(p.id)}
                        title={p.description}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${activeFilter === p.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                            }`}
                    >
                        {p.label}
                        {p.nudgeTemplate && <span className="ml-1 opacity-60">📣</span>}
                    </button>
                ))}
            </div>

            {/* Results row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                        <strong>{totalCount}</strong> {totalCount === 1 ? 'student' : 'students'} · <span className="italic">{preset.description}</span>
                    </p>
                    {activeFilter !== 'ALL' && (
                        <button onClick={() => setFilter('ALL')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                            <X className="h-3 w-3" /> Clear
                        </button>
                    )}
                </div>

                {hasNudge && (
                    <Button size="sm" variant="outline"
                        className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => setNotifyMode(v => !v)}>
                        <Bell className="h-3.5 w-3.5" />
                        Notify {filteredStudentIds.length} Student{filteredStudentIds.length !== 1 ? 's' : ''}
                    </Button>
                )}
            </div>

            {/* Notification composer */}
            {notifyMode && hasNudge && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                    <p className="text-sm font-semibold text-indigo-800">
                        📣 Send to {filteredStudentIds.length} {preset.label} student{filteredStudentIds.length !== 1 ? 's' : ''}
                    </p>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setUseCustom(false)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!useCustom ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                        >
                            📝 Use template
                        </button>
                        <button
                            onClick={() => setUseCustom(true)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${useCustom ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                        >
                            ✏️ Custom message
                        </button>
                    </div>

                    {!useCustom ? (
                        <p className="text-xs text-indigo-700 bg-white rounded-lg border border-indigo-100 px-3 py-2 leading-relaxed">
                            {preset.nudgeTemplate?.replace(/\{\{name\}\}/g, '<student name>')}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            <input className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white"
                                placeholder="Notification title..." value={customTitle}
                                onChange={e => setCustomTitle(e.target.value)} />
                            <textarea className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white resize-none"
                                rows={3} placeholder="Message..." value={customMessage}
                                onChange={e => setCustomMessage(e.target.value)} />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button size="sm" disabled={isPending} onClick={handleSend}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isPending ? 'Sending...' : `Send Notification`}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setNotifyMode(false)}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
