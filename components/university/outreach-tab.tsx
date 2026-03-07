'use client'

/**
 * components/university/outreach-tab.tsx
 *
 * Tab: "Discover Students" — university dashboard
 * Two sub-views:
 *   A. Ready to Nudge  — matched students who haven't expressed interest yet
 *   B. Outreach History — sent messages with status
 */

import { useState, useTransition } from 'react'
import { sendProactiveMessage } from '@/app/university/actions/outreach'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Send, Clock, CheckCircle, MessageSquare, Users,
    ChevronRight, Zap, Globe, BookOpen, CalendarDays, Coins
} from 'lucide-react'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────
type NudgeableStudent = {
    id: string
    maskedName: string
    country: string
    city: string
    fieldOfInterest: string
    preferredDegree: string
    preferredIntake: string
    budgetRange: string
    scoreLabel: string
    lastNudgedAt: string | null   // ISO string (serialised Date)
    cooldownDays: number
    bookmarkedAfterNudge: boolean
    profileUpdatedAfterNudge: boolean
}

type OutreachRecord = {
    id: string
    subject: string | null
    content: string
    sentAt: string
    status: 'SENT' | 'OPENED' | 'REPLIED' | 'CONVERTED' | 'NO_RESPONSE'
    student: { maskedName: string; fieldOfInterest: string | null; country: string | null }
}

type OutreachTabProps = {
    students: NudgeableStudent[]
    history: OutreachRecord[]
    universityName: string
}

// ── Status config ──────────────────────────────────────────────────────
const STATUS: Record<OutreachRecord['status'], { label: string; color: string }> = {
    SENT: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
    OPENED: { label: 'Opened', color: 'bg-amber-100 text-amber-700' },
    REPLIED: { label: 'Replied', color: 'bg-green-100 text-green-700' },
    CONVERTED: { label: 'Converted', color: 'bg-purple-100 text-purple-700' },
    NO_RESPONSE: { label: 'No response', color: 'bg-slate-100 text-slate-500' },
}

// ── NudgeCard ──────────────────────────────────────────────────────────
function NudgeCard({ student, uniName }: { student: NudgeableStudent; uniName: string }) {
    const [open, setOpen] = useState(false)
    const [subject, setSubject] = useState(`A message from ${uniName}`)
    const [content, setContent] = useState(
        `Hi ${student.maskedName.split(' ')[0]},\n\nI came across your profile on EdUmeetup and was impressed by your interest in ${student.fieldOfInterest}. We have programs that could be a great fit for you.\n\nI'd love to connect and tell you more about what we offer. Would you be open to a brief conversation?\n\nBest regards,\n${uniName} Admissions`
    )
    const [isPending, startTransition] = useTransition()

    const lastNudged = student.lastNudgedAt ? new Date(student.lastNudgedAt) : null
    const daysAgo = lastNudged
        ? Math.floor((Date.now() - lastNudged.getTime()) / (1000 * 60 * 60 * 24))
        : null
    const daysLeft = daysAgo !== null ? student.cooldownDays - daysAgo : 0
    const reEngaged = student.bookmarkedAfterNudge || student.profileUpdatedAfterNudge
    const onCooldown = lastNudged !== null && daysLeft > 0 && !reEngaged

    function handleSend() {
        startTransition(async () => {
            const fd = new FormData()
            fd.set('studentId', student.id)
            fd.set('subject', subject)
            fd.set('content', content)
            const res = await sendProactiveMessage(fd)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Message sent! The student has been notified.')
                setOpen(false)
            }
        })
    }

    return (
        <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
                {/* Student summary row */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                        <p className="font-semibold text-slate-900">{student.maskedName}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                            {student.country && (
                                <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{student.country}{student.city ? `, ${student.city}` : ''}</span>
                            )}
                            {student.fieldOfInterest && (
                                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{student.fieldOfInterest}</span>
                            )}
                            {student.preferredDegree && (
                                <span className="flex items-center gap-1"><ChevronRight className="h-3 w-3" />{student.preferredDegree}</span>
                            )}
                            {student.preferredIntake && (
                                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{student.preferredIntake}</span>
                            )}
                            {student.budgetRange && (
                                <span className="flex items-center gap-1"><Coins className="h-3 w-3" />{student.budgetRange}</span>
                            )}
                            {student.scoreLabel && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                                    {student.scoreLabel}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action button / status */}
                    {onCooldown ? (
                        <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                <Clock className="h-3 w-3" />
                                {daysLeft}d left
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">Nudged {daysAgo}d ago</p>
                        </div>
                    ) : reEngaged && lastNudged ? (
                        <Button size="sm" onClick={() => setOpen(o => !o)}
                            className="shrink-0 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs">
                            <Zap className="h-3 w-3" />
                            Re-engage
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => setOpen(o => !o)}
                            className="shrink-0 gap-1 text-xs"
                            style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                            <Send className="h-3 w-3" />
                            Nudge
                        </Button>
                    )}
                </div>

                {/* Inline compose form */}
                {open && !onCooldown && (
                    <div className="border-t border-slate-100 pt-3 space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
                            <input
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Message <span className="font-normal text-slate-400">({content.length}/1000)</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={6}
                                maxLength={1000}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            />
                        </div>
                        <div className="flex items-center gap-3 justify-end">
                            <button onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">
                                Cancel
                            </button>
                            <Button onClick={handleSend} disabled={isPending || content.length < 20}
                                className="gap-2 text-sm" style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                                {isPending ? 'Sending…' : <><Send className="h-3.5 w-3.5" />Send Message</>}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Main OutreachTab ───────────────────────────────────────────────────
export function OutreachTab({ students, history, universityName }: OutreachTabProps) {
    const [view, setView] = useState<'nudge' | 'history'>('nudge')

    const totalSent = history.length
    const totalReplied = history.filter(h => h.status === 'REPLIED' || h.status === 'CONVERTED').length
    const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Send className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold text-slate-900">Discover Students</h2>
                    </div>
                    <p className="text-sm text-slate-500">
                        Reach out to matched students before they find you. Don't wait — connect proactively.
                    </p>
                </div>

                {/* Mini stats */}
                {totalSent > 0 && (
                    <div className="flex items-center gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalSent}</p>
                            <p className="text-xs text-slate-500">Sent</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                            <p className="text-2xl font-bold text-green-600">{totalReplied}</p>
                            <p className="text-xs text-slate-500">Replied</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                            <p className="text-2xl font-bold text-primary">{replyRate}%</p>
                            <p className="text-xs text-slate-500">Rate</p>
                        </div>
                    </div>
                )}
            </div>

            {/* View switcher */}
            <div className="flex gap-2 border-b border-slate-200">
                {(['nudge', 'history'] as const).map(v => (
                    <button key={v} onClick={() => setView(v)}
                        className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${view === v
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}>
                        {v === 'nudge'
                            ? <span className="flex items-center gap-2"><Users className="h-4 w-4" />Ready to Nudge {students.length > 0 && <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{students.length}</span>}</span>
                            : <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />Outreach History {totalSent > 0 && <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalSent}</span>}</span>
                        }
                    </button>
                ))}
            </div>

            {/* ── Panel A: Ready to Nudge ────────────────────────────────── */}
            {view === 'nudge' && (
                <>
                    {students.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">No matched students found right now.</p>
                            <p className="text-xs mt-1">We'll surface profiles as students with matching programs join.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                                Showing {students.length} students who match your programs and haven't connected yet.
                                Names and contact details are masked until they respond.
                            </p>
                            {students.map(s => (
                                <NudgeCard key={s.id} student={s} uniName={universityName} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Panel B: Outreach History ──────────────────────────────── */}
            {view === 'history' && (
                <>
                    {history.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No outreach sent yet. Start connecting with students above.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map(rec => (
                                <div key={rec.id}
                                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-900 text-sm">{rec.student.maskedName}</p>
                                            <span className="text-slate-300">·</span>
                                            <p className="text-xs text-slate-500">{rec.student.fieldOfInterest} {rec.student.country ? `· ${rec.student.country}` : ''}</p>
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium">{rec.subject}</p>
                                        <p className="text-xs text-slate-400 line-clamp-1">{rec.content}</p>
                                    </div>
                                    <div className="text-right shrink-0 space-y-1">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS[rec.status].color}`}>
                                            {STATUS[rec.status].label}
                                        </span>
                                        <p className="text-[10px] text-slate-400">
                                            {new Date(rec.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </p>
                                        {rec.status === 'REPLIED' && (
                                            <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-auto" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
