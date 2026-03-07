'use client'

/**
 * components/university/action-centre.tsx
 *
 * Action Centre for university dashboard Overview tab.
 * Card 1: Profile completeness score + task list
 * Card 2: Student discovery feed with proactive message
 */

import { useState, useTransition } from 'react'
import { sendProactiveMessage, dismissStudent } from '@/app/university/actions/engage'
import {
    CheckCircle2, XCircle, ChevronRight, Sparkles,
    GraduationCap, MapPin, BookOpen, Send, X, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────────────────────
type CompletenessTask = {
    id: string
    label: string
    done: boolean
    actionUrl: string
    actionLabel: string
}

type DiscoverableStudent = {
    id: string
    fullName: string | null
    city: string | null
    fieldOfInterest: string | null
    preferredDegree: string | null
    currentStatus: string | null
}

type Props = {
    universityId: string
    repId: string
    completeness: {
        score: number
        tasks: CompletenessTask[]
    }
    discoverableStudents: DiscoverableStudent[]
    programNames: string[]  // for message suggestions
}

// ── Profile Completeness Card ─────────────────────────────────────────────────
function ProfileCompletenessCard({
    score, tasks
}: { score: number; tasks: CompletenessTask[] }) {
    const [expanded, setExpanded] = useState(score < 100)

    const barColor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#3333CC'
    const pendingTasks = tasks.filter(t => !t.done)
    const doneTasks = tasks.filter(t => t.done)

    return (
        <Card className={`border ${score < 60 ? 'border-amber-200' : score >= 80 ? 'border-green-200' : 'border-blue-200'}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        Profile Strength
                    </CardTitle>
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {expanded ? 'Collapse' : 'Expand'}
                    </button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Score + bar */}
                <div>
                    <div className="flex items-end justify-between mb-2">
                        <span className="text-3xl font-black" style={{ color: barColor }}>{score}%</span>
                        <span className="text-xs text-slate-400 mb-1">
                            {doneTasks.length}/{tasks.length} complete
                        </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${score}%`, background: barColor }}
                        />
                    </div>
                    {score < 100 && (
                        <p className="text-xs text-slate-500 mt-1.5">
                            {pendingTasks.length} task{pendingTasks.length > 1 ? 's' : ''} will improve your discoverability
                        </p>
                    )}
                </div>

                {/* Task list */}
                {expanded && (
                    <div className="space-y-2">
                        {pendingTasks.map(task => (
                            <a
                                key={task.id}
                                href={task.actionUrl}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-blue-50/40 transition-all group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                                    <span className="text-sm text-slate-700">{task.label}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {task.actionLabel}
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </div>
                            </a>
                        ))}
                        {doneTasks.map(task => (
                            <div key={task.id}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/60">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                <span className="text-sm text-slate-400 line-through">{task.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {score === 100 && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Profile complete — students can discover you fully
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Student Card ──────────────────────────────────────────────────────────────
function StudentCard({
    student, universityId, repId, programNames, onDismiss
}: {
    student: DiscoverableStudent
    universityId: string
    repId: string
    programNames: string[]
    onDismiss: (id: string) => void
}) {
    const [mode, setMode] = useState<'idle' | 'composing' | 'sending' | 'sent'>('idle')
    const [message, setMessage] = useState('')
    const [isPending, startTransition] = useTransition()

    const suggestion = `Hi ${student.fullName?.split(' ')[0] || 'there'},\n\nWe came across your profile on EdUmeetup and think you'd be a great fit for our ${programNames[0] || 'programmes'}. We'd love to connect and tell you more about what we offer.\n\nWould you be open to a brief meeting?`

    function handleCompose() {
        setMessage(suggestion)
        setMode('composing')
    }

    function handleSend() {
        if (!message.trim()) return
        setMode('sending')
        const formData = new FormData()
        formData.set('studentId', student.id)
        formData.set('universityId', universityId)
        formData.set('repId', repId)
        formData.set('content', message)
        startTransition(async () => {
            const result = await sendProactiveMessage(formData)
            if (result.success) setMode('sent')
            else setMode('composing')
        })
    }

    function handleDismiss() {
        const formData = new FormData()
        formData.set('studentId', student.id)
        formData.set('universityId', universityId)
        startTransition(async () => {
            await dismissStudent(formData)
            onDismiss(student.id)
        })
    }

    if (mode === 'sent') {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-green-800">Message sent to {student.fullName}</p>
                    <p className="text-xs text-green-600 mt-0.5">You&apos;ll be notified when they respond</p>
                </div>
            </div>
        )
    }

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                                {(student.fullName || '?')[0].toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                {student.fullName || 'Anonymous Student'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {student.city && (
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                        <MapPin className="h-3 w-3" />{student.city}
                                    </span>
                                )}
                                {student.fieldOfInterest && (
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                        <BookOpen className="h-3 w-3" />{student.fieldOfInterest}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        disabled={isPending}
                        className="text-slate-300 hover:text-slate-500 transition-colors p-1 shrink-0"
                        title="Not a fit — remove from list"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex gap-1.5 mt-3 flex-wrap">
                    {student.preferredDegree && (
                        <span className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5">
                            {student.preferredDegree}
                        </span>
                    )}
                    {student.currentStatus && (
                        <span className="text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5">
                            {student.currentStatus}
                        </span>
                    )}
                </div>
            </div>

            {mode === 'composing' || mode === 'sending' ? (
                <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/60">
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={5}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-blue-400 bg-white"
                        placeholder="Write your message..."
                    />
                    <div className="flex gap-2">
                        <Button onClick={handleSend} disabled={mode === 'sending' || !message.trim()} size="sm" className="flex-1 gap-1.5">
                            {mode === 'sending'
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                                : <><Send className="h-3.5 w-3.5" /> Send Message</>}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('idle')} disabled={mode === 'sending'}>
                            Cancel
                        </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                        The student will receive a notification and email. They can reply from their dashboard.
                    </p>
                </div>
            ) : (
                <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/40">
                    <span className="text-xs text-slate-400">Matches your programme fields</span>
                    <button onClick={handleCompose} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                        <Send className="h-3.5 w-3.5" />
                        Reach out
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Student Discovery Card ────────────────────────────────────────────────────
function StudentDiscoveryCard({ students, universityId, repId, programNames }: {
    students: DiscoverableStudent[]
    universityId: string
    repId: string
    programNames: string[]
}) {
    const [visible, setVisible] = useState(students.map(s => s.id))
    const visibleStudents = students.filter(s => visible.includes(s.id))

    return (
        <Card className={`border ${visibleStudents.length > 0 ? 'border-primary/20' : 'border-slate-200'}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        Student Discovery
                        {visibleStudents.length > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">
                                {visibleStudents.length}
                            </span>
                        )}
                    </CardTitle>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                    Students whose interests match your programmes — reach out directly.
                </p>
            </CardHeader>
            <CardContent>
                {visibleStudents.length === 0 ? (
                    <div className="text-center py-8">
                        <GraduationCap className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">No new students to discover right now.</p>
                        <p className="text-xs text-slate-300 mt-1">Check back as more students join the platform.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visibleStudents.slice(0, 5).map(student => (
                            <StudentCard
                                key={student.id}
                                student={student}
                                universityId={universityId}
                                repId={repId}
                                programNames={programNames}
                                onDismiss={(id) => setVisible(v => v.filter(sid => sid !== id))}
                            />
                        ))}
                        {visibleStudents.length > 5 && (
                            <p className="text-xs text-center text-slate-400 pt-1">
                                +{visibleStudents.length - 5} more students match your programmes
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Action Centre (exported) ──────────────────────────────────────────────────
export function ActionCentre({ universityId, repId, completeness, discoverableStudents, programNames }: Props) {
    const hasWork = completeness.score < 100 || discoverableStudents.length > 0
    if (!hasWork) return null

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full bg-primary" />
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Action Centre</h2>
                <span className="text-xs text-slate-400">— things you can do right now</span>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
                {completeness.score < 100 && (
                    <ProfileCompletenessCard score={completeness.score} tasks={completeness.tasks} />
                )}
                <StudentDiscoveryCard
                    students={discoverableStudents}
                    universityId={universityId}
                    repId={repId}
                    programNames={programNames}
                />
            </div>
        </section>
    )
}
