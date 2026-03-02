'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { submitStudentProctorEnquiry, submitUniversityProctorEnquiry } from './actions'
import {
    ShieldCheck, MapPin, Clock, Users, GraduationCap, Building2,
    CheckCircle2, Loader2, Send, Globe, FileCheck, Award, Phone
} from 'lucide-react'

// ── Trust Badges ──────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
    { icon: ShieldCheck, label: 'Approved Proctor Site', sub: 'Recognised by international universities' },
    { icon: MapPin, label: 'Ahmedabad, Gujarat', sub: 'On-site invigilated exams' },
    { icon: Clock, label: '24h Response', sub: 'We confirm within one business day' },
    { icon: Globe, label: '50+ Universities', sub: 'Partnered globally' },
]

const FEATURES = [
    { icon: FileCheck, title: 'Secure Invigilation', body: 'CCTV-monitored, identity-verified exam environment meeting international standards.' },
    { icon: Award, title: 'IAES Certified', body: 'Indo American Education Society — formally recognised by partner universities.' },
    { icon: Users, title: 'Flexible Capacity', body: 'Individual students to cohorts of 50+. Weekdays and weekends available.' },
    { icon: Phone, title: 'Dedicated Support', body: 'Personal coordinator for every booking. WhatsApp + email helpline.' },
]

// ── Student Form ──────────────────────────────────────────────────────────────
function StudentForm() {
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setState('loading')
        const formData = new FormData(e.currentTarget)
        const res = await submitStudentProctorEnquiry(formData)
        if (res.error) { setErrorMsg(res.error); setState('error') }
        else setState('success')
    }

    if (state === 'success') return (
        <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Enquiry Received!</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
                We'll contact you within 24 hours to confirm your proctored exam arrangement. Check your inbox for a confirmation email.
            </p>
        </div>
    )

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="s-fullName">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="s-fullName" name="fullName" placeholder="Priya Sharma" required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="s-email">Email Address <span className="text-red-500">*</span></Label>
                    <Input id="s-email" name="email" type="email" placeholder="priya@example.com" required />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="s-phone">Phone / WhatsApp</Label>
                    <Input id="s-phone" name="phone" placeholder="+91 98765 43210" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="s-city">Your City</Label>
                    <Input id="s-city" name="city" placeholder="Ahmedabad" />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="s-universityName">University Name <span className="text-red-500">*</span></Label>
                <Input id="s-universityName" name="universityName" placeholder="University of Hertfordshire, UK" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="s-subject">Exam Subject</Label>
                    <Input id="s-subject" name="subject" placeholder="Business Law" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="s-examType">Exam Type</Label>
                    <Input id="s-examType" name="examType" placeholder="Online Proctored / Paper-based" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="s-examDate">Exam Date <span className="text-red-500">*</span></Label>
                    <Input id="s-examDate" name="examDate" type="date" required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="s-duration">Duration</Label>
                    <Input id="s-duration" name="duration" placeholder="2 hours" />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="s-notes">Special Requirements / Notes</Label>
                <Textarea id="s-notes" name="notes" placeholder="e.g. Open book, calculator allowed, requires internet access…" rows={3} />
            </div>

            {state === 'error' && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{errorMsg}</p>
            )}

            <Button type="submit" className="w-full h-11 text-base" disabled={state === 'loading'}>
                {state === 'loading' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : <><Send className="mr-2 h-4 w-4" />Submit Enquiry</>}
            </Button>
        </form>
    )
}

// ── University Form ───────────────────────────────────────────────────────────
function UniversityForm() {
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setState('loading')
        const formData = new FormData(e.currentTarget)
        const res = await submitUniversityProctorEnquiry(formData)
        if (res.error) { setErrorMsg(res.error); setState('error') }
        else setState('success')
    }

    if (state === 'success') return (
        <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Partnership Enquiry Received!</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
                Our team will contact you within 24 hours to discuss next steps and begin the proctor registration process.
            </p>
        </div>
    )

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="u-institutionName">Institution Name <span className="text-red-500">*</span></Label>
                    <Input id="u-institutionName" name="institutionName" placeholder="Oxford Brookes University" required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="u-country">Country</Label>
                    <Input id="u-country" name="country" placeholder="United Kingdom" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="u-contactName">Contact Name <span className="text-red-500">*</span></Label>
                    <Input id="u-contactName" name="contactName" placeholder="Dr. Sarah Johnson" required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="u-contactTitle">Title / Role</Label>
                    <Input id="u-contactTitle" name="contactTitle" placeholder="Examinations Officer" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="u-email">Email Address <span className="text-red-500">*</span></Label>
                    <Input id="u-email" name="email" type="email" placeholder="exams@university.ac.uk" required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="u-phone">Phone</Label>
                    <Input id="u-phone" name="phone" placeholder="+44 1865 xxxxxx" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="u-examStart">Exam Period Start <span className="text-red-500">*</span></Label>
                    <Input id="u-examStart" name="examStart" type="date" required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="u-examEnd">Exam Period End</Label>
                    <Input id="u-examEnd" name="examEnd" type="date" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="u-studentCount">Approx. Students in India</Label>
                    <Input id="u-studentCount" name="studentCount" type="number" placeholder="15" min="1" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="u-examType">Exam Type</Label>
                    <Input id="u-examType" name="examType" placeholder="Online / Paper-based" />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="u-subjects">Subjects / Modules</Label>
                <Input id="u-subjects" name="subjects" placeholder="Business Law, Financial Accounting, Marketing…" />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="u-policyUrl">Proctor Policy URL (if available)</Label>
                <Input id="u-policyUrl" name="policyUrl" type="url" placeholder="https://your-university.ac.uk/exam-policy" />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="u-requirements">Specific Proctor Requirements</Label>
                <Textarea id="u-requirements" name="requirements" placeholder="e.g. BYOD laptop policy, specific software required, ID verification method…" rows={3} />
            </div>

            {state === 'error' && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{errorMsg}</p>
            )}

            <Button type="submit" className="w-full h-11 text-base" disabled={state === 'loading'}>
                {state === 'loading' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : <><Building2 className="mr-2 h-4 w-4" />Submit Partnership Enquiry</>}
            </Button>
        </form>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProctorPage() {
    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── Hero ── */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
                <div className="max-w-5xl mx-auto px-6 py-20 text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm font-medium text-blue-300 mb-6">
                        <ShieldCheck className="h-4 w-4" /> IAES Approved Proctor Site · Ahmedabad, India
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                        Proctored Exam Centre<br />
                        <span className="text-blue-400">for International Students</span>
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
                        edUmeetup / IAES provides a secure, CCTV-monitored exam environment for students in Gujarat pursuing degrees from UK, USA, Australia, and other international universities.
                    </p>

                    {/* Trust strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
                        {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
                            <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-4 text-left">
                                <Icon className="h-5 w-5 text-blue-400 mb-2" />
                                <p className="text-sm font-semibold">{label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Features ── */}
            <div className="max-w-5xl mx-auto px-6 py-16">
                <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Why students & universities choose us</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {FEATURES.map(({ icon: Icon, title, body }) => (
                        <div key={title} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                                <Icon className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1.5">{title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Forms ── */}
            <div className="max-w-2xl mx-auto px-6 pb-20" id="enquiry">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Submit an Enquiry</h2>
                    <p className="text-slate-500 mt-2">Students booking their own exam, or universities setting up a proctor partnership.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                    <Tabs defaultValue="student" className="w-full">
                        <TabsList className="w-full rounded-none border-b border-slate-100 h-14 bg-slate-50 p-1">
                            <TabsTrigger value="student" className="flex-1 gap-2 text-sm font-medium">
                                <GraduationCap className="h-4 w-4" /> I'm a Student
                            </TabsTrigger>
                            <TabsTrigger value="university" className="flex-1 gap-2 text-sm font-medium">
                                <Building2 className="h-4 w-4" /> I'm a University
                            </TabsTrigger>
                        </TabsList>

                        <div className="p-6 sm:p-8">
                            <TabsContent value="student" className="mt-0">
                                <p className="text-sm text-slate-500 mb-5">
                                    If your university requires you to take your exam at an approved proctor site, we can arrange that.
                                </p>
                                <StudentForm />
                            </TabsContent>

                            <TabsContent value="university" className="mt-0">
                                <p className="text-sm text-slate-500 mb-5">
                                    Register IAES / edUmeetup as an official proctor site for your students in Gujarat, India.
                                </p>
                                <UniversityForm />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Contact strip */}
                <div className="mt-6 text-center text-sm text-slate-400">
                    Questions? Email us at{' '}
                    <a href="mailto:proctor@edumeetup.com" className="text-blue-600 hover:underline font-medium">
                        proctor@edumeetup.com
                    </a>
                    {' '}or WhatsApp us directly.
                </div>
            </div>
        </div>
    )
}
