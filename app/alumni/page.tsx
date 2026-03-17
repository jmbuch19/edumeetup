import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { GraduationCap, Lock, ArrowRight, BookOpen, MapPin } from 'lucide-react'

// Fetch a small public sample — enough to show 6 blurred cards
async function getPublicAlumniSample() {
    return prisma.alumni.findMany({
        where: {
            isVerified: true,
            adminReviewStatus: { not: 'SUSPENDED' },
            availableFor: { isEmpty: false },
        },
        select: {
            id: true,
            usUniversityName: true,
            usProgram: true,
            alumniStatus: true,
            helpTopics: true,
            inspirationMessage: true,
            yearWentToUSA: true,
            usCity: true,
            user: { select: { name: true } }
        },
        take: 6,
    })
}

const STATUS_LABEL: Record<string, { label: string; emoji: string }> = {
    STUDENT_CURRENTLY: { label: 'Currently Studying', emoji: '📚' },
    OPT_CPT:           { label: 'On OPT/CPT',         emoji: '✈️' },
    H1B_PENDING:       { label: 'H1B Pending',        emoji: '⏳' },
    H1B_APPROVED:      { label: 'Working (H1B)',      emoji: '💼' },
    H1B_OTHER:         { label: 'Working (H1B)',      emoji: '💼' },
    GREEN_CARD:        { label: 'Permanent Resident', emoji: '🌟' },
    PR_OTHER_COUNTRY:  { label: 'PR Abroad',          emoji: '🌍' },
    EMPLOYED_USA:      { label: 'Employed in USA',    emoji: '🏢' },
    FURTHER_STUDIES:   { label: 'Further Studies',    emoji: '🎓' },
    RETURNED_HOME:     { label: 'Returned Home',      emoji: '🏠' },
    OTHER:             { label: 'Alumni',             emoji: '⭐' },
}

const TOPIC_LABEL: Record<string, string> = {
    CHOOSING_UNIVERSITY: 'Choosing University',
    FIRST_SEMESTER:      'First Semester',
    INTERNSHIPS_JOBS:    'Internships & Jobs',
    LIFE_IN_US:          'Life in the US',
}

export default async function PublicAlumniPage() {
    const session = await auth()

    // Authenticated students → send to their dashboard's Alumni Bridge tab
    if (session?.user?.id && session.user.role === 'STUDENT') {
        redirect('/student/dashboard?tab=alumni')
    }
    if (session?.user?.id && session.user.role === 'ALUMNI') {
        redirect('/alumni/dashboard')
    }

    const alumni = await getPublicAlumniSample()

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0B1340] via-[#0d1a52] to-slate-50">

            {/* ── Wordmark bar ── */}
            <div className="px-8 pt-7 flex items-center gap-2">
                <Link href="/" className="text-white font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
                    Ed<span className="text-[#C9A84C]">U</span>meetup
                </Link>
                <span className="text-[#C9A84C] text-xs opacity-50 font-medium">powered by IAES</span>
                <Link href="/login" className="ml-auto text-xs text-white/60 hover:text-white transition-colors underline underline-offset-2">
                    Sign in
                </Link>
            </div>

            {/* ── Hero ── */}
            <section className="text-center px-6 pt-16 pb-12 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-4 py-1.5 mb-6">
                    <GraduationCap className="w-3.5 h-3.5 text-[#C9A84C]" />
                    <span className="text-[#C9A84C] text-xs font-semibold">IAES Alumni Bridge</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
                    IAES graduates who made it<br />
                    <span className="text-[#C9A84C]">to the USA — and want to help you.</span>
                </h1>
                <p className="text-blue-200 text-lg leading-relaxed max-w-2xl mx-auto">
                    Real students from Gujarat who went to top US universities. They've answered
                    your question, lived your fear, and survived your first semester.
                    Create a free account to read their stories and connect with them.
                </p>
            </section>

            {/* ── Blurred cards grid ── */}
            <section className="relative px-4 pb-0 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alumni.map((a, i) => {
                        const initials = (a.user?.name ?? 'A').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        const status = STATUS_LABEL[a.alumniStatus] ?? { label: 'Alumni', emoji: '⭐' }
                        // First 2 cards slightly visible, rest more blurred
                        const blurLevel = i < 2 ? 'blur-[3px]' : 'blur-[6px]'

                        return (
                            <div key={a.id} className={`relative select-none pointer-events-none ${blurLevel} opacity-80`}>
                                <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
                                    <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                                    <div className="p-5">
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 text-sm">{a.user?.name ?? 'Alumni'}</p>
                                                <p className="text-xs text-gray-400 truncate">{a.usProgram}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <BookOpen className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                            <p className="text-xs font-medium text-gray-600 truncate">{a.usUniversityName}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                {status.emoji} {status.label}
                                            </span>
                                            {a.usCity && (
                                                <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">
                                                    <MapPin className="w-2.5 h-2.5 inline mr-0.5" />{a.usCity}
                                                </span>
                                            )}
                                        </div>
                                        {a.helpTopics.slice(0, 2).map(t => (
                                            <span key={t} className="inline-block mr-1 mb-1 text-[10px] px-1.5 py-0.5 rounded border border-amber-100 text-amber-600 bg-amber-50">
                                                {TOPIC_LABEL[t] ?? t}
                                            </span>
                                        ))}
                                        {a.inspirationMessage && (
                                            <p className="text-xs text-gray-400 italic mt-2 line-clamp-2">"{a.inspirationMessage}"</p>
                                        )}
                                        <div className="mt-4 pt-3 border-t border-gray-50">
                                            <div className="h-7 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full w-24" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Fade-to-white gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pointer-events-none" />

                {/* Unlock CTA — overlaid in the lower half */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-2 z-10">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 px-8 py-8 max-w-md w-full mx-4 text-center">
                        <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {alumni.length}+ IAES Alumni available
                        </h2>
                        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                            Create a free EdUmeetup student account to read full profiles,
                            see which topics they cover, and send a connect request — all in one place.
                        </p>
                        <Link href="/student/register"
                            className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#B8973B] text-[#0B1340] font-bold px-7 py-3 rounded-full transition-colors shadow-lg shadow-[#C9A84C]/20 text-sm w-full justify-center">
                            Create Free Account <ArrowRight className="w-4 h-4" />
                        </Link>
                        <p className="text-xs text-gray-400 mt-3">
                            Already have an account?{' '}
                            <Link href="/login" className="text-indigo-600 hover:underline font-medium">Sign in →</Link>
                        </p>
                    </div>
                </div>
            </section>

            {/* Spacer for CTA card */}
            <div className="h-80 bg-slate-50" />

            {/* ── Stats strip ── */}
            <section className="bg-slate-50 py-12 px-4 border-t border-slate-100">
                <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                    {[
                        { num: `${alumni.length}+`, label: 'Alumni mentors' },
                        { num: 'FREE',  label: 'Always free for students' },
                        { num: '3 min', label: 'To send a request' },
                        { num: '100%',  label: 'Alumni consent verified' },
                    ].map(s => (
                        <div key={s.label}>
                            <p className="text-3xl font-bold text-amber-600">{s.num}</p>
                            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    )
}

export const metadata = {
    title: 'IAES Alumni Bridge | EdUmeetup',
    description: 'Connect with IAES graduates studying or working in the USA. Get real guidance from alumni who have been where you are.',
}
