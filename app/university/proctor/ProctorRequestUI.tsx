'use client'

import { useState, useTransition } from 'react'
import { submitProctorRequest, getMyProctorRequests } from './actions'
import {
    Shield, FileText, ChevronRight, CheckCircle, Loader2,
    Clock, CalendarDays, Users, AlertCircle, CheckCheck, XCircle
} from 'lucide-react'
import { ProctorRequestStatus } from '@prisma/client'

type ProctorRequest = {
    id: string
    examStartDate: Date
    examEndDate: Date
    subjects: string
    studentCount: number
    examType: string
    durationMinutes: number
    requirements: string | null
    status: ProctorRequestStatus
    adminNotes: string | null
    fees: number | null
    confirmedAt: Date | null
    createdAt: Date
}

const STATUS_CONFIG: Record<ProctorRequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <AlertCircle className="h-3 w-3" /> },
    CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="h-3 w-3" /> },
    COMPLETED: { label: 'Completed', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <CheckCheck className="h-3 w-3" /> },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600 border-red-200', icon: <XCircle className="h-3 w-3" /> },
}

function Field({ label, name, type = 'text', placeholder = '', required = false, as, children }: {
    label: string; name: string; type?: string; placeholder?: string
    required?: boolean; as?: 'textarea' | 'select'; children?: React.ReactNode
}) {
    const base = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white"
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

function StatusBadge({ status }: { status: ProctorRequestStatus }) {
    const cfg = STATUS_CONFIG[status]
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
            {cfg.icon} {cfg.label}
        </span>
    )
}

function fmt(d: Date | string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProctorRequestUI({ initial }: { initial: ProctorRequest[] }) {
    const [tab, setTab] = useState<'form' | 'requests'>('form')
    const [requests, setRequests] = useState<ProctorRequest[]>(initial)
    const [formState, setFormState] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [isPending, startTransition] = useTransition()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
            const res = await submitProctorRequest({}, fd)
            if (res.success) {
                setFormState('success')
                const updated = await getMyProctorRequests()
                setRequests(updated as ProctorRequest[])
            } else {
                setFormState('error')
                setErrorMsg(res.error || 'Something went wrong.')
            }
        })
    }

    const activeCount = requests.filter(r => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold text-slate-900">Proctor Services</h1>
                </div>
                <p className="text-sm text-slate-500">
                    Request EdUmeetup / IAES to proctor your upcoming exams for students in India.
                </p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
                <button onClick={() => { setTab('form'); setFormState('idle') }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'form' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                    <FileText className="h-4 w-4" /> Request Proctoring
                </button>
                <button onClick={() => setTab('requests')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'requests' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CalendarDays className="h-4 w-4" /> My Requests
                    {activeCount > 0 && (
                        <span className="bg-primary text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{activeCount}</span>
                    )}
                </button>
            </div>

            {/* Request form */}
            {tab === 'form' && (
                formState === 'success' ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="h-7 w-7 text-green-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Request Submitted!</h2>
                        <p className="text-sm text-slate-500 mb-4">Jaydeep has been notified. We'll respond within 24 hours.</p>
                        <button onClick={() => { setFormState('idle'); setTab('requests') }}
                            className="text-sm text-primary underline underline-offset-4">
                            View my requests →
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Exam Start Date *" name="examStartDate" type="date" required />
                                <Field label="Exam End Date *" name="examEndDate" type="date" required />
                            </div>
                            <Field label="Subjects / Courses *" name="subjects" placeholder="e.g. Business Law, Statistics" required />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Field label="Number of Students *" name="studentCount" type="number" placeholder="e.g. 12" required />
                                <Field label="Duration (mins) *" name="durationMinutes" type="number" placeholder="e.g. 120" required />
                                <Field label="Exam Type *" name="examType" as="select" required>
                                    <option value="">Select type</option>
                                    <option value="midterm">Midterm</option>
                                    <option value="final">Final Exam</option>
                                    <option value="multiple">Multiple Sittings</option>
                                    <option value="other">Other</option>
                                </Field>
                            </div>
                            <Field label="Special Requirements" name="requirements" as="textarea"
                                placeholder="Closed book, calculator policy, ID requirements..." />
                            <Field label="Proctor Policy URL" name="policyUrl" type="url"
                                placeholder="https://your-university.ac.uk/exam-policy" />

                            {formState === 'error' && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{errorMsg}</p>
                            )}

                            <button type="submit" disabled={isPending}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-60 transition-all"
                                style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Submit Request <ChevronRight className="h-4 w-4" /></>}
                            </button>
                            <p className="text-xs text-slate-400">We respond within 24 hours · All arrangements handled by our team</p>
                        </form>
                    </div>
                )
            )}

            {/* My requests list */}
            {tab === 'requests' && (
                <div className="space-y-3">
                    {requests.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No proctor requests yet.</p>
                            <button onClick={() => setTab('form')} className="text-sm text-primary underline underline-offset-4 mt-2">
                                Submit your first request →
                            </button>
                        </div>
                    ) : requests.map(r => (
                        <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                    <p className="font-semibold text-slate-900">{r.subjects}</p>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        <CalendarDays className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                                        {fmt(r.examStartDate)} – {fmt(r.examEndDate)}
                                        <span className="mx-2 text-slate-300">·</span>
                                        <Users className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                                        {r.studentCount} students · {r.durationMinutes} min · {r.examType}
                                    </p>
                                </div>
                                <StatusBadge status={r.status} />
                            </div>

                            {r.adminNotes && (
                                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-700">
                                    <strong className="font-semibold">Note from EdUmeetup:</strong> {r.adminNotes}
                                </div>
                            )}

                            {r.fees && r.status === 'CONFIRMED' && (
                                <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 text-sm text-green-700">
                                    <strong>Service Fee:</strong> ${r.fees.toFixed(2)} USD — our team will contact you with payment details
                                </div>
                            )}

                            <p className="text-xs text-slate-400 mt-3">Submitted {fmt(r.createdAt)}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
