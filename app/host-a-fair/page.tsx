'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Globe, School, Calendar, CheckCircle, MapPin, Users } from "lucide-react"

export default function HostFairLandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">

            {/* Hero Section */}
            <section className="relative w-full py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 -skew-y-3 origin-top-left scale-110" />

                <div className="container relative mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center rounded-full border border-primary/20 bg-white/50 backdrop-blur-sm px-3 py-1 text-sm font-medium text-primary shadow-sm">
                            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                            For Indian Institutions
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                            Bring the <span className="text-primary">World</span> to <br className="hidden md:block" /> Your Campus.
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 max-w-lg mx-auto md:mx-0 leading-relaxed">
                            Host exclusive recruitment fairs with top verified foreign universities.
                            Give your students global exposure right at your doorstep.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
                            <Link href="/host-a-fair/request">
                                <Button size="lg" className="text-lg h-14 px-8 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all w-full sm:w-auto">
                                    Request a Proposal
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="relative hidden md:flex justify-center">
                        {/* Decorative blob */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-3xl animate-pulse" />

                        <div className="relative bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full rotate-2 hover:rotate-0 transition-transform duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <School className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">University of Excellence</h3>
                                    <p className="text-sm text-slate-500">London, UK</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span className="text-sm">Travelling to: <span className="font-semibold text-slate-900">Your Institute</span></span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span className="text-sm">Preferred Date: <span className="font-semibold text-slate-900">Oct 15 - 20</span></span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg">
                                    <Users className="h-4 w-4 text-primary" />
                                    <span className="text-sm">Student Footfall: <span className="font-semibold text-slate-900">500+</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Info Cards Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                        <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
                        <p className="text-slate-600">Partnering with edUmeetup makes hosting international education fairs seamless and impactful.</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {/* 1. WHY */}
                        <div className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                            <div className="h-12 w-12 bg-blue-100 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Globe className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Why Host?</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Attract international exposure, provide your students direct access to foreign universities, and strengthen your institutional reputation.
                            </p>
                        </div>

                        {/* 2. HOW */}
                        <div className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                            <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">The Process</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                You submit a request → We verify & plan → We connect you with top universities → You host the event. We handle the coordination.
                            </p>
                        </div>

                        {/* 3. WHAT */}
                        <div className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                            <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <School className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">What's Included?</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Full outreach management, university coordination, marketing collateral support, and a dedicated relationship manager.
                            </p>
                        </div>

                        {/* 4. WHEN */}
                        <div className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                            <div className="h-12 w-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">When?</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Schedule a date that aligns with your academic calendar. We typically require a 6-8 week lead time for optimal university turnout.
                            </p>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <Link href="/host-a-fair/request">
                            <Button size="lg" className="px-12 h-14 text-lg">
                                Get Started
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <p className="mt-4 text-sm text-slate-500">
                            No upfront commitment required. Request a proposal to learn more.
                        </p>
                    </div>
                </div>
            </section>

        </div>
    )
}
