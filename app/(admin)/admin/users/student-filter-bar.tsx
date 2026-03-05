'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
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
    const isWalkin = activeFilter === 'fair_walkin'

    // Split into core and fair groups
    const corePresets = FILTER_PRESETS.filter(p => !p.group)
    const fairPresets = FILTER_PRESETS.filter(p => p.group === 'FAIR')

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

    const chipBase = 'text-xs px-3 py-1.5 rounded-full border font-medium transition-all'
    const chipActive = 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
    const chipInactive = 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
    const chipWalkinActive = 'bg-amber-500 text-white border-amber-500 shadow-sm'
    const chipWalkinInactive = 'bg-white text-amber-600 border-amber-200 hover:border-amber-400 hover:text-amber-700'

    return (
        <div className="space-y-3">
            {/* Core filter chips */}
            <div className="flex flex-wrap gap-2">
                {corePresets.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setFilter(p.id)}
                        title={p.description}
                        className={`${chipBase} ${activeFilter === p.id ? chipActive : chipInactive}`}
                    >
                        {p.label}
                        {p.nudgeTemplate && <span className="ml-1 opacity-60">📣</span>}
                    </button>
                ))}
            </div>

            {/* Fair Mode group */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🎪 Fair Mode</p>
                <div className="flex flex-wrap gap-2">
                    {fairPresets.map(p => {
                        const walkin = p.id === 'fair_walkin'
                        const isActive = activeFilter === p.id
                        return (
                            <button
                                key={p.id}
                                onClick={() => setFilter(p.id)}
                                title={p.description}
                                className={`${chipBase} ${walkin
                                        ? isActive ? chipWalkinActive : chipWalkinInactive
                                        : isActive ? chipActive : chipInactive
                                    }`}
                            >
                                {walkin && <span className="mr-1">⚠️</span>}
                                {p.label}
                                {p.nudgeTemplate && <span className="ml-1 opacity-60">📣</span>}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Walk-in info banner */}
            {isWalkin && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                    ⚠️ These students registered at the fair venue but don't have a full edUmeetup profile yet.
                    You can reach them via <strong>email only</strong>. They won't appear in the student table below.
                </div>
            )}

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

                {hasNudge && !isWalkin && (
                    <Button size="sm" variant="outline"
                        className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => setNotifyMode(v => !v)}>
                        <Bell className="h-3.5 w-3.5" />
                        Notify {filteredStudentIds.length} Student{filteredStudentIds.length !== 1 ? 's' : ''}
                    </Button>
                )}
            </div>

            {/* Notification composer — standard filters only */}
            {notifyMode && hasNudge && !isWalkin && (
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
