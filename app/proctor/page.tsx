'use client'

import { useState, useTransition } from 'react'
import { submitStudentProctorEnquiry, submitUniversityProctorEnquiry } from './actions'
import { MapPin, GraduationCap, Building2, Share2, CheckCircle, ChevronRight, Shield, Clock, Award, Phone, Mail, Globe } from 'lucide-react'

// ── IAES Credentials ──────────────────────────────────────────────────────────
const IAES = {
    orgName: 'Indo American Education Society (IAES)',
    shortName: 'IAES / EdUmeetup',
    address: 'Ahmedabad, Gujarat, India',
    website: 'www.edumeetup.com',
    email: 'proctor@edumeetup.com',
    phone: '+91 79 XXXX XXXX',
    affiliation: 'Registered Society under the Societies Registration Act, India',
    description: 'Recognised proctoring partner for international university examinations conducted remotely in India.',
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function ProctorPage() {
    const [activeTab, setActiveTab] = useState<'student' | 'university'>('student')
    const [formState, setFormState] = useState<FormState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [isPending, startTransition] = useTransition()

    function handleShare() {
        const url = window.location.href
        if (navigator.share) {
            navigator.share({ title: 'Exam Proctoring in India — EdUmeetup', url })
        } else {
            navigator.clipboard.writeText(url)
            alert('Page link copied to clipboard!')
        }
    }

    async function handleStudentSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setFormState('submitting')
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const result = await submitStudentProctorEnquiry(formData)
            if (result.success) setFormState('success')
            else { setFormState('error'); setErrorMsg(result.error || 'Something went wrong.') }
        })
    }

    async function handleUniversitySubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setFormState('submitting')
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const result = await submitUniversityProctorEnquiry(formData)
            if (result.success) setFormState('success')
            else { setFormState('error'); setErrorMsg(result.error || 'Something went wrong.') }
        })
    }

    return (
        <main className="min-h-screen bg-white">

            {/* ── Hero ─────────────────────────────────────────────────────────── */}
            <section style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #3333CC 60%, #1a1a8c 100%)' }}
                className="relative overflow-hidden">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
                        <Shield className="h-3.5 w-3.5 text-blue-200" />
                        <span className="text-blue-100 text-xs font-medium tracking-wide uppercase">Official Exam Proctoring · India</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                        Sit Your University Exam<br />
                        <span style={{ color: '#c7d2fe' }}>Anywhere in India</span>
                    </h1>
                    <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
                        EdUmeetup / IAES is a registered proctoring centre for international university examinations.
                        We handle the paperwork, the venue, and the invigilation — so you focus on the exam.
                    </p>

                    <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
                        {[
                            { icon: Shield, label: 'Officially registered proctor site' },
                            { icon: Award, label: 'Accepted by international universities' },
                            { icon: Clock, label: 'Flexible exam scheduling' },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="bg-white/10 border border-white/15 rounded-xl p-4 text-center">
                                <Icon className="h-5 w-5 text-blue-200 mx-auto mb-2" />
                                <p className="text-blue-100 text-xs leading-snug">{label}</p>
                            </div>
                        ))}
                    </div>

                    <button onClick={handleShare}
                        className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all">
                        <Share2 className="h-4 w-4" />
                        Share this page with your university / student
                    </button>
                </div>
            </section>

            {/* ── How it works ──────────────────────────────────────────────────── */}
            <section className="bg-slate-50 border-b border-slate-100 py-12">
                <div className="max-w-4xl mx-auto px-6">
                    <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">How It Works</p>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { step: '01', title: 'Submit your enquiry', desc: 'Fill in the form below — student or university. Takes 2 minutes.' },
                            { step: '02', title: 'We coordinate everything', desc: 'Our team contacts you, submits proctor approval to your university, and confirms the venue.' },
                            { step: '03', title: 'Sit your exam', desc: 'Arrive at our Ahmedabad centre on exam day. We handle the rest.' },
                        ].map(({ step, title, desc }) => (
                            <div key={step} className="flex gap-4">
                                <div className="text-3xl font-black text-slate-200 leading-none w-12 shrink-0">{step}</div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Two-tab form ──────────────────────────────────────────────────── */}
            <section className="max-w-2xl mx-auto px-6 py-16">

                <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
                    <button
                        onClick={() => { setActiveTab('student'); setFormState('idle') }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'student' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                            }`}>
                        <GraduationCap className="h-4 w-4" />
                        I'm a Student
                    </button>
                    <button
                        onClick={() => { setActiveTab('university'); setFormState('idle') }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'university' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                            }`}>
                        <Building2 className="h-4 w-4" />
                        I'm a University
                    </button>
                </div>

                {formState === 'success' ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Enquiry Received!</h2>
                        <p className="text-slate-500 mb-6">
                            Our team will contact you within <strong>24 hours</strong> to confirm arrangements.
                        </p>
                        <button onClick={() => setFormState('idle')} className="text-sm text-primary underline underline-offset-4">
                            Submit another enquiry
                        </button>
                    </div>
                ) : activeTab === 'student' ? (
                    <form onSubmit={handleStudentSubmit} className="space-y-5">
                        <div className="mb-2">
                            <h2 className="text-xl font-bold text-slate-900">Student Enquiry</h2>
                            <p className="text-sm text-slate-500 mt-1">Tell us about your exam and we'll arrange an approved proctor site for you.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Full Name *" name="fullName" placeholder="As per university records" required />
                            <Field label="Email *" name="email" type="email" placeholder="your@email.com" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Phone *" name="phone" placeholder="+91 98XXX XXXXX" required />
                            <Field label="City *" name="city" placeholder="Ahmedabad" required />
                        </div>
                        <Field label="University Name *" name="universityName" placeholder="e.g. Stanford OHS, University of London" required />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Course / Subject *" name="subject" placeholder="e.g. Discrete Mathematics" required />
                            <Field label="Exam Type *" name="examType" as="select" required>
                                <option value="">Select type</option>
                                <option value="midterm">Midterm</option>
                                <option value="final">Final Exam</option>
                                <option value="other">Other</option>
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Exam Date (approx.) *" name="examDate" type="date" required />
                            <Field label="Duration" name="duration" placeholder="e.g. 2 hours" />
                        </div>
                        <Field label="Any special requirements or notes" name="notes" as="textarea"
                            placeholder="e.g. calculator allowed, open/closed book, specific software needed..." />

                        {formState === 'error' && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{errorMsg}</p>
                        )}

                        <button type="submit" disabled={isPending}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                            {isPending ? 'Sending...' : <>Submit Enquiry <ChevronRight className="h-4 w-4" /></>}
                        </button>
                        <p className="text-xs text-center text-slate-400">We'll respond within 24 hours · No fees until confirmed</p>
                    </form>

                ) : (
                    <form onSubmit={handleUniversitySubmit} className="space-y-5">
                        <div className="mb-2">
                            <h2 className="text-xl font-bold text-slate-900">University Partnership Enquiry</h2>
                            <p className="text-sm text-slate-500 mt-1">Need a registered proctor site for your students in India? We handle everything.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Institution Name *" name="institutionName" placeholder="Stanford OHS" required />
                            <Field label="Country *" name="country" placeholder="United States" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Contact Person *" name="contactName" placeholder="Dr. Jane Smith" required />
                            <Field label="Title / Position *" name="contactTitle" placeholder="Director of Academics" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Email *" name="email" type="email" placeholder="exams@university.edu" required />
                            <Field label="Phone" name="phone" placeholder="+1 XXX XXX XXXX" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Exam Period (start) *" name="examStart" type="date" required />
                            <Field label="Exam Period (end) *" name="examEnd" type="date" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Number of Students *" name="studentCount" type="number" placeholder="e.g. 5" required />
                            <Field label="Exam Type *" name="examType" as="select" required>
                                <option value="">Select type</option>
                                <option value="midterm">Midterm</option>
                                <option value="final">Final Exam</option>
                                <option value="multiple">Multiple exams</option>
                                <option value="other">Other</option>
                            </Field>
                        </div>
                        <Field label="Course(s) / Subject(s) *" name="subjects"
                            placeholder="e.g. Discrete Mathematics, Statistics" required />
                        <Field label="Proctor Requirements" name="requirements" as="textarea"
                            placeholder="e.g. closed book, no calculator, specific software, duration, any university-specific proctor approval form..." />
                        <Field label="University Proctor Policy URL" name="policyUrl" type="url"
                            placeholder="https://ulo.stanford.edu/policies-ulo#testing" />

                        {formState === 'error' && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{errorMsg}</p>
                        )}

                        <button type="submit" disabled={isPending}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                            {isPending ? 'Sending...' : <>Submit Partnership Enquiry <ChevronRight className="h-4 w-4" /></>}
                        </button>
                        <p className="text-xs text-center text-slate-400">We'll respond within 24 hours · All arrangements handled by our team</p>
                    </form>
                )}
            </section>

            {/* ── IAES Credentials ──────────────────────────────────────────────── */}
            <section className="border-t border-slate-100 bg-slate-50 py-16">
                <div className="max-w-3xl mx-auto px-6">
                    <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">Our Proctor Site Details</p>
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100"
                            style={{ background: 'linear-gradient(135deg, #f0f4ff, #e8eeff)' }}>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#3333CC' }}>
                                    <Shield className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{IAES.orgName}</h3>
                                    <p className="text-xs text-slate-500">{IAES.affiliation}</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-6 grid md:grid-cols-2 gap-4">
                            <CredentialRow icon={MapPin} label="Address" value={IAES.address} />
                            <CredentialRow icon={Globe} label="Website" value={IAES.website} />
                            <CredentialRow icon={Mail} label="Proctor Email" value={IAES.email} />
                            <CredentialRow icon={Phone} label="Phone" value={IAES.phone} />
                        </div>
                        <div className="px-8 pb-6">
                            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                                <strong className="text-slate-700">Universities:</strong> {IAES.description} Please share this page with
                                your students or contact us directly to begin the proctor approval process.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
                        <button onClick={handleShare}
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4">
                            <Share2 className="h-4 w-4" />
                            Share this page with your university or student
                        </button>
                        <span className="hidden sm:block text-slate-300">·</span>
                        <a
                            href="/proctor/credentials"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary hover:underline underline-offset-4 transition-colors">
                            ⬇ Download Proctor Details PDF
                        </a>
                    </div>
                </div>
            </section>

        </main>
    )
}

// ── Reusable field component ──────────────────────────────────────────────────
function Field({
    label, name, type = 'text', placeholder = '', required = false,
    as, children
}: {
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

// ── Credential row ────────────────────────────────────────────────────────────
function CredentialRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-sm text-slate-800 font-medium">{value}</p>
            </div>
        </div>
    )
}
