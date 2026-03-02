/**
 * components/university/proctor-tab.tsx
 *
 * Tab 7 in university dashboard.
 * Shows: submit form (if no active request) + request history with status timeline.
 */

'use client'

import { useState, useTransition } from 'react'
import { submitProctorRequest } from '@/app/university/actions/proctor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Shield, CheckCircle, Clock, ChevronRight, AlertCircle,
    CalendarDays, Users, BookOpen, FileText, ExternalLink
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type ProctorRequestStatus = 'PENDING' | 'UNDER_REVIEW' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

type ProctorRequest = {
    id: string
    examType: string
    subjects: string
    examStartDate: string
    examEndDate: string
    studentCount: number
    durationMinutes: number
    requirements?: string | null
    policyUrl?: string | null
    status: ProctorRequestStatus
    adminNotes?: string | null
    confirmedAt?: string | null
    createdAt: string
}

type Props = {
    universityId: string
    universityName: string
    requests: ProctorRequest[]
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ProctorRequestStatus, {
    label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
    PENDING: {
        label: 'Pending Review',
        color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
        icon: <Clock className="h-3.5 w-3.5" />,
    },
    UNDER_REVIEW: {
        label: 'Under Review',
        color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    CONFIRMED: {
        label: 'Confirmed',
        color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
        icon: <CheckCircle className="h-3.5 w-3.5" />,
    },
    COMPLETED: {
        label: 'Completed',
        color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200',
        icon: <CheckCircle className="h-3.5 w-3.5" />,
    },
    CANCELLED: {
        label: 'Cancelled',
        color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
}

// ── Status timeline ───────────────────────────────────────────────────────────
const TIMELINE: ProctorRequestStatus[] = ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'COMPLETED']

function StatusTimeline({ current }: { current: ProctorRequestStatus }) {
    if (current === 'CANCELLED') return (
        <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> This request was cancelled.
        </div>
    )

    const currentIdx = TIMELINE.indexOf(current)
    return (
        <div className="flex items-center gap-1 flex-wrap">
            {TIMELINE.map((step, idx) => {
                const cfg = STATUS_CONFIG[step]
                const done = idx <= currentIdx
                const active = idx === currentIdx
                return (
                    <div key={step} className="flex items-center gap-1">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${done
                                ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            } ${active ? 'ring-2 ring-offset-1 ring-primary/30' : ''}`}>
                            {cfg.icon}
                            {cfg.label}
                        </div>
                        {idx < TIMELINE.length - 1 && (
                            <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${done && idx < currentIdx ? 'text-slate-400' : 'text-slate-200'}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ── Stat mini-component ───────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-slate-800 capitalize">{value}</p>
            </div>
        </div>
    )
}

// ── Request card ──────────────────────────────────────────────────────────────
function RequestCard({ req }: { req: ProctorRequest }) {
    const cfg = STATUS_CONFIG[req.status]
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    })

    return (
        <Card className={`border ${req.status === 'CONFIRMED' ? 'border-green-200 bg-green-50/30' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">{req.subjects}</CardTitle>
                        <CardDescription className="mt-0.5">
                            {req.examType.charAt(0).toUpperCase() + req.examType.slice(1)} ·{' '}
                            {fmt(req.examStartDate)} – {fmt(req.examEndDate)}
                        </CardDescription>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} shrink-0`}>
                        {cfg.icon} {cfg.label}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <Stat icon={Users} label="Students" value={String(req.studentCount)} />
                    <Stat icon={Clock} label="Duration" value={`${req.durationMinutes} min`} />
                    <Stat icon={BookOpen} label="Type" value={req.examType} />
                </div>

                {req.requirements && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">Requirements: </span>{req.requirements}
                    </div>
                )}

                {req.policyUrl && (
                    <a href={req.policyUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Proctor Policy
                    </a>
                )}

                {req.adminNotes && req.status === 'CONFIRMED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-green-800 mb-1">Note from EdUmeetup team:</p>
                        <p className="text-sm text-green-700">{req.adminNotes}</p>
                    </div>
                )}

                <div className="pt-2 border-t border-slate-100 overflow-x-auto">
                    <StatusTimeline current={req.status} />
                </div>

                <p className="text-xs text-slate-400">
                    Submitted {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                    })}
                </p>
            </CardContent>
        </Card>
    )
}

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ label, name, type = 'text', placeholder = '', required = false, as, children }: {
    label: string; name: string; type?: string; placeholder?: string
    required?: boolean; as?: 'textarea' | 'select'; children?: React.ReactNode
}) {
    const base = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white"
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
            {as === 'textarea' ? (
                <textarea name={name} placeholder={placeholder} required={required} rows={3} className={`${base} resize-none`} />
            ) : as === 'select' ? (
                <select name={name} required={required} className={base}>{children}</select>
            ) : (
                <input type={type} name={name} placeholder={placeholder} required={required} className={base} />
            )}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProctorTab({ universityId, universityName, requests }: Props) {
    const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [isPending, startTransition] = useTransition()

    const activeRequests = requests.filter(r => !['COMPLETED', 'CANCELLED'].includes(r.status))
    const pastRequests = requests.filter(r => ['COMPLETED', 'CANCELLED'].includes(r.status))
    const hasActiveRequest = activeRequests.length > 0

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setFormState('submitting')
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const result = await submitProctorRequest(formData)
            if (result.success) setFormState('success')
            else { setFormState('error'); setErrorMsg(result.error || 'Something went wrong.') }
        })
    }

    return (
        <div className="space-y-6">

            {/* Intro banner */}
            <div className="rounded-2xl border border-primary/20 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)' }}>
                <div className="flex items-start gap-4 p-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Proctored Exam Services</h3>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-xl">
                            EdUmeetup / IAES is a registered proctoring centre in Ahmedabad, India.
                            If you have students in India who need to sit a proctored exam, we handle the venue,
                            the invigilation, and the paperwork — so your students can focus on the exam.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-3">
                            {['Officially registered centre', 'Closed & open book exams', 'University approval handled by us'].map(t => (
                                <span key={t} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-white border border-primary/20 rounded-full px-3 py-1">
                                    <CheckCircle className="h-3 w-3" /> {t}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Active requests */}
            {activeRequests.length > 0 && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Active Requests</h3>
                    {activeRequests.map(req => <RequestCard key={req.id} req={req} />)}
                </div>
            )}

            {/* New request form / success */}
            {formState === 'success' ? (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-8 pb-8 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="h-7 w-7 text-green-600" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">Request Submitted!</h3>
                        <p className="text-sm text-slate-600 max-w-sm mx-auto">
                            Our team will review your request and contact you within <strong>24 hours</strong> to confirm arrangements.
                        </p>
                        <button onClick={() => setFormState('idle')}
                            className="mt-4 text-sm text-primary underline underline-offset-4">
                            Submit another request
                        </button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            {hasActiveRequest ? 'Submit Another Request' : 'Request Proctor Services'}
                        </CardTitle>
                        <CardDescription>
                            Fill in your exam details and we'll arrange everything — proctor approval, venue, and invigilation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="hidden" name="universityId" value={universityId} />
                            <input type="hidden" name="universityName" value={universityName} />

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Exam Type *" name="examType" as="select" required>
                                    <option value="">Select type</option>
                                    <option value="midterm">Midterm</option>
                                    <option value="final">Final Exam</option>
                                    <option value="multiple">Multiple Exams</option>
                                    <option value="other">Other</option>
                                </Field>
                                <Field label="Number of Students *" name="studentCount" type="number" placeholder="e.g. 5" required />
                            </div>

                            <Field label="Course(s) / Subject(s) *" name="subjects"
                                placeholder="e.g. Discrete Mathematics, Statistics 101" required />

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Exam Period — Start *" name="examStartDate" type="date" required />
                                <Field label="Exam Period — End *" name="examEndDate" type="date" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Exam Duration (minutes) *" name="durationMinutes" type="number"
                                    placeholder="e.g. 120" required />
                                <Field label="Proctor Policy URL" name="policyUrl" type="url"
                                    placeholder="https://ulo.stanford.edu/..." />
                            </div>

                            <Field label="Requirements & Instructions" name="requirements" as="textarea"
                                placeholder="e.g. Closed book, calculator allowed, no notes. Students must show ID..." />

                            {formState === 'error' && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                                    {errorMsg}
                                </p>
                            )}

                            <Button type="submit" disabled={isPending} className="w-full">
                                {isPending ? 'Submitting...' : 'Submit Proctor Request'}
                            </Button>
                            <p className="text-xs text-center text-slate-400">
                                Our team will respond within 24 hours · No payment required at this stage
                            </p>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Past requests */}
            {pastRequests.length > 0 && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-slate-500">Past Requests</h3>
                    {pastRequests.map(req => <RequestCard key={req.id} req={req} />)}
                </div>
            )}

        </div>
    )
}
