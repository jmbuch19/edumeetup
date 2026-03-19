'use client'

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, School, ArrowRight, Shield, GraduationCap, CalendarDays, MapPin, Building2, ChevronRight } from "lucide-react";
import { HowItWorks } from "@/components/home/how-it-works";
import { HeroFeatures } from "@/components/hero-features";
import { motion } from "framer-motion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Image from "next/image"

type HeroSlide = {
    id: string
    title: string
    partnerName: string
    imageUrl: string
    targetUrl: string
    sponsorType: string // UNIVERSITY, PROGRAM, PARTNER
    //... other fields if needed for display
}

import { FairCircuitsSection } from "@/components/home/fair-circuits-section";

export function HomeClient({ slides = [], circuits = [] }: { slides?: HeroSlide[], circuits?: any[] }) {
    const [activeTab, setActiveTab] = useState<'student' | 'university'>('student');
    const hasTrackedRef = useRef(false);

    useEffect(() => {
        if (slides.length > 0 && !hasTrackedRef.current) {
            hasTrackedRef.current = true;
            // Fire and forget impression tracking
            fetch('/api/sponsor/impression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: slides.map(s => s.id) })
            }).catch(console.error);
        }
    }, [slides]);

    const scrollToHowItWorks = (tab: 'student' | 'university') => {
        setActiveTab(tab);
        const element = document.getElementById('how-it-works');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">

            {/* 
          HERO SECTION LOGIC:
          - If slides exist, show Carousel.
          - Else, show Default Hero.
      */}

            {slides.length > 0 ? (
                <section className="w-full pt-6 pb-12 overflow-hidden">
                    <Carousel className="w-full max-w-[95%] xl:max-w-7xl mx-auto" opts={{ loop: true, align: "center" }}>
                        <CarouselContent>
                            {slides.map((slide) => (
                                <CarouselItem key={slide.id}>
                                    <div className="relative aspect-[21/9] md:aspect-[2.5/1] w-full overflow-hidden rounded-2xl shadow-xl">
                                        <Image
                                            src={slide.imageUrl}
                                            alt={slide.title}
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-16 text-white text-left">
                                            <div className="max-w-3xl space-y-4 animate-in slide-in-from-bottom-5 duration-700">
                                                <div className="inline-block px-3 py-1 bg-yellow-500/90 text-black text-xs font-bold rounded-full uppercase tracking-wider backdrop-blur-sm">
                                                    Sponsored
                                                </div>
                                                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-lg">{slide.title}</h2>
                                                <p className="text-lg md:text-2xl text-white/95 font-medium drop-shadow-md">{slide.partnerName}</p>
                                                <Button asChild size="lg" className="mt-6 bg-white text-black hover:bg-white/90 border-0 h-12 px-8 text-base">
                                                    <Link href={`/api/sponsor/click?id=${slide.id}`}>
                                                        {slide.sponsorType === 'UNIVERSITY' ? 'Explore Programs' : 'Learn More'}
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="hidden md:block">
                            <CarouselPrevious className="left-8 border-none bg-black/20 hover:bg-black/40 text-white" />
                            <CarouselNext className="right-8 border-none bg-black/20 hover:bg-black/40 text-white" />
                        </div>
                    </Carousel>
                </section>
            ) : (
                /* Default Hero */
                <section className="w-full flex-1 grid md:grid-cols-2 gap-8 items-center container mx-auto px-4 py-12 md:py-24">
                    {/* Left Column: Content */}
                    <div className="flex flex-col items-start text-left space-y-8 animate-in slide-in-from-left-5 duration-500">
                        <div className="space-y-4">
                            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                                <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                                The Future of Campus Recruitment
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
                                Where Dreams Meet <span className="text-primary">Destinations</span>.
                            </h1>
                            <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
                                EdUmeetup brings students, mentors, and top-tier institutions together.
                                Guidance, exposure, and direction — all in one place.
                            </p>
                            <p className="text-base text-slate-500 max-w-lg leading-relaxed">
                                Meet verified international universities, attend official campus fairs, and get trusted guidance for studying abroad — with support at every step of the journey.
                            </p>
                            <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                                Built with real experience in international education and campus recruitment.
                                Designed to support universities in reaching students across India today, with planned expansion across South Asia through a trusted and structured platform — connecting institutions with pre-qualified, intent-driven students.
                            </p>

                            {/* University value proposition */}
                            <div className="mt-2 border-t border-slate-100 pt-5 space-y-2">
                                <p className="text-xs font-semibold text-primary uppercase tracking-widest">For Universities &amp; Institutions</p>
                                <p className="text-base text-slate-600 max-w-lg leading-relaxed">
                                    Reach <span className="font-semibold text-slate-800">pre-qualified, intent-driven students</span> from India and beyond — without cold outreach or high agent commissions.
                                </p>
                                <ul className="space-y-1.5 text-sm text-slate-500 max-w-lg">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                        Host virtual or in-person campus fairs — we handle logistics
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                        1-on-1 video meetings with shortlisted students — scheduled instantly
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                        Official institution profile — builds trust before the first conversation
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                            <Button
                                size="lg"
                                className="text-lg h-14 px-8 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                                onClick={() => scrollToHowItWorks('student')}
                            >
                                <User className="h-5 w-5" />
                                I&apos;m a Student
                            </Button>

                            <Button
                                size="lg"
                                variant="outline"
                                className="text-lg h-14 px-8 gap-2 bg-white hover:bg-slate-50 border-slate-200"
                                onClick={() => scrollToHowItWorks('university')}
                            >
                                <School className="h-5 w-5" />
                                I&apos;m a University
                            </Button>
                        </div>


                    </div>

                    {/* Right Column: Visual */}
                    <div className="relative h-full min-h-[400px] w-full hidden md:flex items-center justify-center animate-in fade-in duration-700 delay-200">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
                        <div className="relative z-10 grid grid-cols-2 gap-4 p-4">
                            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-3 -rotate-6 hover:rotate-0 transition-transform duration-500">
                                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <User className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <div className="h-2 w-24 bg-slate-100 rounded mb-2"></div>
                                    <div className="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-3 translate-y-12 rotate-3 hover:rotate-0 transition-transform duration-500">
                                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <School className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <div className="h-2 w-24 bg-slate-100 rounded mb-2"></div>
                                    <div className="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                            </div>

                            <Link href="/host-a-fair" className="col-span-2 mx-auto w-full">
                                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-purple-100 flex items-center gap-4 hover:scale-105 transition-transform cursor-pointer">
                                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">🇮🇳</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Host a Fair in India</p>
                                        <p className="text-xs text-slate-500">For Indian Institutions</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-purple-600 ml-auto" />
                                </div>
                            </Link>

                            <Link href="/proctor" className="col-span-1 mx-auto w-full">
                                <div className="relative bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-blue-100 flex flex-col items-center text-center gap-2 hover:scale-105 transition-transform cursor-pointer h-full justify-center">
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                                        <Shield className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-[13px] leading-tight">Exam Proctoring</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Ahmedabad Centre</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/student/dashboard?tab=fairs" className="col-span-1 mx-auto w-full">
                                <div className="relative bg-teal-50/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-teal-200 flex flex-col items-center text-center gap-2 hover:scale-105 transition-transform cursor-pointer h-full justify-center">
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-teal-600">
                                        <MapPin className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-teal-900 text-[13px] leading-tight">Attend a Fair</p>
                                        <p className="text-[11px] text-teal-700 mt-0.5" suppressHydrationWarning>Western India Circuit</p>
                                    </div>
                                    <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-amber-500 rounded-full px-1.5 py-0.5 uppercase tracking-wide leading-none">
                                        Live
                                    </span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Services at a glance strip ────────────────────────────── */}
            <section className="w-full bg-white border-y border-slate-100 py-10 px-4">
                <div className="container max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">What we offer</h2>
                        <Link href="/services" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                            View all services <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {[
                            { icon: GraduationCap, label: 'Student Matching', href: '/services#student-matching', color: '#3333CC', bg: '#eff1ff' },
                            { icon: CalendarDays, label: 'Video Meetings', href: '/services#video-meetings', color: '#0284c7', bg: '#e0f2fe' },
                            { icon: MapPin, label: 'Campus Fairs', href: '/services#campus-fair', color: '#7c3aed', bg: '#f3e8ff' },
                            { icon: Shield, label: 'Exam Proctoring', href: '/services#proctor', color: '#1e3a5f', bg: '#e8edf5' },
                            { icon: Building2, label: 'University Recruitment', href: '/services#university-recruitment', color: '#059669', bg: '#d1fae5' },
                        ].map(({ icon: Icon, label, href, color, bg }) => (
                            <Link key={href} href={href}
                                className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all text-center bg-white">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                    style={{ background: bg }}>
                                    <Icon className="h-5 w-5" style={{ color }} />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
                                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }} />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Hero Features Accordion */}
            <section className="w-full py-12 md:py-24 overflow-hidden">
                <HeroFeatures />
            </section>

            <HowItWorks activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Fair Circuits Information */}
            <FairCircuitsSection circuits={circuits} />

            {/* ── Alumni Bridge Banner ───────────────────────────────────── */}
            <section className="w-full bg-[#0B1340] py-14 px-4 overflow-hidden relative">
                {/* subtle glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#C9A84C]/10 blur-3xl" />
                </div>
                <div className="relative container max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-16">
                    {/* Left: copy */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-3 py-1 mb-4">
                            <GraduationCap className="h-3.5 w-3.5 text-[#C9A84C]" />
                            <span className="text-[#C9A84C] text-xs font-semibold tracking-wide">IAES Alumni Bridge</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3">
                            Are you an IAES Alumnus<br className="hidden md:block" />{" "}
                            <span className="text-[#C9A84C]">studying or working in the USA?</span>
                        </h2>
                        <p className="text-blue-200 text-base leading-relaxed max-w-xl">
                            Your journey from Ahmedabad to a US university is exactly what the next
                            student needs to hear. Join the Alumni Bridge — share your story, inspire
                            futures, and be a pro-bono mentor on your own terms.
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-6 justify-center md:justify-start">
                            <Link href="/alumni-register"
                                className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#B8973B] text-[#0B1340] font-bold px-7 py-3 rounded-full transition-colors shadow-lg shadow-[#C9A84C]/20 text-sm">
                                Join as Alumni Mentor <ArrowRight className="h-4 w-4" />
                            </Link>
                            <span className="text-blue-300 text-xs opacity-60">🔒 You control who contacts you</span>
                        </div>
                    </div>
                    {/* Right: 3 value quick-chips */}
                    <div className="flex flex-col gap-3 shrink-0 w-full md:w-64">
                        {[
                            { emoji: "📍", text: "3-minute setup, no paperwork" },
                            { emoji: "💛", text: "Give back on your own schedule" },
                            { emoji: "🎓", text: "Help future IAES students succeed" },
                        ].map(v => (
                            <div key={v.text} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                <span className="text-lg">{v.emoji}</span>
                                <span className="text-sm text-blue-100 leading-snug">{v.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Context-Aware Sticky Bar */}
            {
                activeTab === 'university' && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-white/90 backdrop-blur-lg border border-slate-200/60 p-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-2.5 rounded-xl">
                                    <School className="h-6 w-6 text-primary" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-slate-900">University Portal</p>
                                    <p className="text-sm text-slate-500">Connect with future students directly.</p>
                                </div>
                            </div>
                            <Link href="/university/register">
                                <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
                                    Register Now
                                </Button>
                            </Link>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
