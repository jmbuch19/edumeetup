import Link from 'next/link'
import {
    GraduationCap, CalendarDays, MapPin, Shield,
    Users, ArrowRight, CheckCircle, Globe, Building2
} from 'lucide-react'

export const metadata = {
    title: 'Our Services — EdUmeetup',
    description: 'Discover every service EdUmeetup offers: student matching, university recruitment, campus fairs in India, and IAES-approved exam proctoring.',
}

const SERVICES = [
    {
        id: 'student-matching',
        icon: GraduationCap,
        accent: '#3333CC',
        accentLight: '#eff1ff',
        badge: 'For Students · Free',
        title: 'Student–University Matching',
        tagline: 'Find the right university. No agents. No fees.',
        description:
            'Build your profile once. Our platform surfaces verified universities that match your field of interest, target country, degree level, and budget. Express interest in one click — the university sees your academic summary and responds directly.',
        bullets: [
            'Admin-verified universities only — no fake listings',
            'Filter by country, program, intake, tuition, scholarship',
            'One-click interest expression — no long application forms',
            'Direct conversation with admissions teams',
            'Completely free for students, forever',
        ],
        cta: { label: 'Create Free Profile', href: '/student/register' },
        secondaryCta: { label: 'Browse Universities', href: '/universities' },
    },
    {
        id: 'video-meetings',
        icon: CalendarDays,
        accent: '#0284c7',
        accentLight: '#e0f2fe',
        badge: 'For Students & Universities',
        title: 'Direct Video Meetings',
        tagline: 'Real conversations. Real admissions teams.',
        description:
            'When a university accepts your interest, you book a 30-minute video consultation directly in the dashboard — no third-party scheduling tools, no cold emails. Universities set their own availability slots; students pick and confirm in seconds.',
        bullets: [
            'Availability slots managed by university reps',
            'Self-service booking — no back-and-forth email',
            'Automated reminders for both sides',
            'Reschedule or cancel anytime from your dashboard',
            'Meeting history and notes stored in your profile',
        ],
        cta: { label: 'Explore Universities', href: '/universities' },
        secondaryCta: null,
    },
    {
        id: 'campus-fair',
        icon: MapPin,
        accent: '#7c3aed',
        accentLight: '#f3e8ff',
        badge: 'For Indian Institutions',
        title: 'Host a Campus Fair',
        tagline: 'Bring the world to your campus.',
        description:
            'Indian colleges, schools, and institutions can invite verified international universities to host a campus fair on their premises. Submit your request, choose your dates, and EdUmeetup handles outreach to partner universities on your behalf.',
        bullets: [
            'Open to all Indian educational institutions — no minimum size',
            'EdUmeetup contacts international universities on your behalf',
            'Universities confirm interest and logistics directly',
            'Coordinate multi-day events with multiple institutions',
            'Full request tracking in your dashboard',
        ],
        cta: { label: 'Request a Fair', href: '/host-a-fair' },
        secondaryCta: null,
    },
    {
        id: 'proctor',
        icon: Shield,
        accent: '#1e3a5f',
        accentLight: '#e8edf5',
        badge: 'For Partner Universities · IAES Approved',
        title: 'Exam Proctoring in India',
        tagline: 'Your exams. Our certified centre. Ahmedabad, Gujarat.',
        description:
            'Verified partner universities can designate EdUmeetup / IAES as their official proctoring centre for remote students based in India. Submit a request from your dashboard, specify exam dates and student count, and our team confirms within 24 hours.',
        bullets: [
            'IAES-approved examination centre — Ahmedabad, Gujarat',
            'Online request form — no paperwork, no calls needed',
            'Status tracked: Pending → Under Review → Confirmed → Completed',
            'Agent reminders if exam date approaches without confirmation',
            'Admin notes and fee details communicated via your dashboard',
        ],
        cta: { label: 'Proctor Services', href: '/proctor' },
        secondaryCta: { label: 'University Login', href: '/login' },
        university: true,
    },
    {
        id: 'university-recruitment',
        icon: Building2,
        accent: '#059669',
        accentLight: '#d1fae5',
        badge: 'For International Universities',
        title: 'University Recruitment Platform',
        tagline: 'Direct pipeline. Qualified leads. Your dashboard.',
        description:
            'List your programs, receive self-selecting student interest, and manage the entire recruitment pipeline — all without paying per-student agent commissions. Every student who contacts you has already read your requirements.',
        bullets: [
            'Admin-verified listing builds instant student trust',
            'Full student academic profile before you accept or decline',
            'CRM dashboard — interests, meetings, notes, export',
            'Flat platform fee — no per-enrolment commission',
            'Proctor services + campus fair integration in one platform',
        ],
        cta: { label: 'Register Your University', href: '/university/register' },
        secondaryCta: { label: 'Learn More', href: '/#how-it-works' },
    },
]

function ServiceCard({ service, index }: { service: typeof SERVICES[0]; index: number }) {
    const Icon = service.icon
    const isReversed = index % 2 === 1

    return (
        <section
            id={service.id}
            className={`py-20 px-4 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
        >
            <div className={`container max-w-6xl mx-auto flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>

                {/* Visual side */}
                <div className="lg:w-2/5 flex-shrink-0">
                    <div
                        className="rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-6 shadow-xl"
                        style={{ background: `linear-gradient(135deg, ${service.accent}18, ${service.accent}08)`, border: `1px solid ${service.accent}20` }}
                    >
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: service.accent }}>
                            <Icon className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <span
                                className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
                                style={{ background: service.accentLight, color: service.accent }}
                            >
                                {service.badge}
                            </span>
                            <p className="text-2xl font-bold text-slate-900 leading-tight">{service.tagline}</p>
                        </div>

                        <div className="flex flex-col gap-2 w-full pt-4 border-t border-slate-200">
                            <Link
                                href={service.cta.href}
                                className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-2"
                                style={{ background: service.accent }}
                            >
                                {service.cta.label}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            {service.secondaryCta && (
                                <Link
                                    href={service.secondaryCta.href}
                                    className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-white hover:shadow-sm transition-all text-center"
                                >
                                    {service.secondaryCta.label}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content side */}
                <div className="lg:w-3/5 space-y-6">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
                            {service.title}
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed">{service.description}</p>
                    </div>

                    <ul className="space-y-3">
                        {service.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: service.accent }} />
                                <span className="text-slate-700">{b}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}

export default function ServicesPage() {
    return (
        <div className="min-h-screen">

            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#1e3a5f] to-[#3333CC] text-white py-24 px-4">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 0%, transparent 60%), radial-gradient(circle at 80% 20%, #3333CC 0%, transparent 60%)' }} />

                <div className="container max-w-5xl mx-auto relative text-center space-y-6">
                    <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                        <Globe className="h-4 w-4" />
                        EdUmeetup · IAES · Ahmedabad, India
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                        Every Service.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
                            One Platform.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
                        From student matching to exam proctoring — EdUmeetup is the complete infrastructure
                        layer between international universities and the Indian education ecosystem.
                    </p>

                    {/* Quick jump nav */}
                    <div className="flex flex-wrap justify-center gap-3 pt-4">
                        {SERVICES.map(s => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium transition-all backdrop-blur-sm"
                            >
                                <s.icon className="h-4 w-4" />
                                {s.title.split('–')[0].split(' in ')[0].trim()}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Service Sections ──────────────────────────────────────── */}
            {SERVICES.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}

            {/* ── Bottom CTA ───────────────────────────────────────────── */}
            <section className="bg-[#3333CC] text-white py-20 px-4 text-center">
                <div className="container max-w-3xl mx-auto space-y-6">
                    <Users className="h-12 w-12 mx-auto opacity-70" />
                    <h2 className="text-4xl font-bold">Not sure where to start?</h2>
                    <p className="text-lg text-white/80">
                        Whether you&apos;re a student looking for your dream university, an institution wanting to
                        host a fair, or a university needing proctoring support — we&apos;re here.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                        <Link
                            href="/contact"
                            className="px-8 py-4 rounded-xl font-semibold bg-white text-[#3333CC] hover:bg-white/90 transition-all hover:shadow-lg"
                        >
                            Contact Us →
                        </Link>
                        <Link
                            href="/universities"
                            className="px-8 py-4 rounded-xl font-semibold border border-white/30 text-white hover:bg-white/10 transition-all"
                        >
                            Browse Universities
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
