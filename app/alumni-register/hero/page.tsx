// Route: /alumni-register/hero
// Seen by anyone (unauthenticated or non-ALUMNI) before the form
import Link from "next/link";

export default function AlumniHeroPage() {
    return (
        <main className="min-h-screen bg-[#0B1340] text-white flex flex-col">

            {/* ── Wordmark ── */}
            <div className="px-8 pt-8 flex items-center gap-2">
                <span className="text-white font-bold text-xl tracking-tight">
                    Ed<span className="text-[#C9A84C]">U</span>meetup
                </span>
                <span className="text-[#C9A84C] text-xs opacity-60 font-medium">
                    powered by IAES
                </span>
            </div>

            {/* ── Hero ── */}
            <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="max-w-3xl mx-auto">

                    {/* Gratitude badge */}
                    <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-4 py-1.5 mb-8">
                        <span className="text-[#C9A84C] text-sm font-medium">
                            🎓 IAES Alumni — A Thank You From All of Us
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                        You made it.
                        <br />
                        <span className="text-[#C9A84C]">Now help the next one.</span>
                    </h1>

                    {/* Body */}
                    <p className="text-lg text-blue-100 leading-relaxed mb-4 max-w-2xl mx-auto">
                        From Ahmedabad to a US university — your journey is exactly what the next
                        student needs to hear. Thousands of students from Gujarat are right now
                        where you were: nervous, unsure, wondering if they can actually do this.
                    </p>
                    <p className="text-lg text-blue-100 leading-relaxed mb-10 max-w-2xl mx-auto">
                        <span className="text-white font-semibold">Your story — 3 minutes of your time</span>{" "}
                        — can be the thing that convinces them they can.
                    </p>

                    {/* Value props */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full max-w-2xl mx-auto">
                        {[
                            {
                                icon: "🔒",
                                title: "Full privacy control",
                                desc: "You decide exactly who can contact you and how",
                            },
                            {
                                icon: "⏱️",
                                title: "3 minutes to set up",
                                desc: "Simple form, no paperwork, no commitments",
                            },
                            {
                                icon: "💛",
                                title: "Pro-bono, always",
                                desc: "Give back on your own terms, at your own pace",
                            },
                        ].map((v) => (
                            <div
                                key={v.title}
                                className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/8 transition-colors"
                            >
                                <div className="text-2xl mb-2">{v.icon}</div>
                                <div className="font-semibold text-sm text-white mb-1">{v.title}</div>
                                <div className="text-xs text-blue-200 leading-relaxed">{v.desc}</div>
                            </div>
                        ))}
                    </div>

                    {/* Primary CTA */}
                    <Link
                        href="/alumni-register/form"
                        className="relative z-50 inline-block bg-[#C9A84C] hover:bg-[#B8973B] active:bg-[#A8873B] text-[#0B1340] font-bold text-lg px-10 py-4 rounded-full transition-colors shadow-lg shadow-[#C9A84C]/20 mb-4"
                    >
                        Join as an Alumni Mentor →
                    </Link>

                    <p className="text-xs text-blue-300 opacity-60 relative z-50">
                        Already registered?{" "}
                        <Link href="/alumni/dashboard" className="underline hover:opacity-100 transition-opacity">
                            Go to your dashboard
                        </Link>
                    </p>
                </div>
            </section>

            {/* ── Quote ── */}
            <section className="border-t border-white/10 py-12 px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <p className="text-blue-200 text-xs mb-6 uppercase tracking-[3px] font-medium">
                        From our alumni
                    </p>
                    <blockquote className="text-xl sm:text-2xl text-white italic leading-relaxed mb-4">
                        "I wish someone had told me what the first semester really feels like.
                        Now I can be that person for the next student from Ahmedabad."
                    </blockquote>
                    <cite className="text-[#C9A84C] text-sm not-italic font-medium">
                        — MS Graduate, Arizona State University
                    </cite>
                </div>
            </section>

            {/* ── IAES trust footer ── */}
            <div className="border-t border-white/10 py-6 px-8 flex items-center justify-between text-xs text-blue-300 opacity-40">
                <span>© Indo American Education Society, Ahmedabad</span>
                <span>edumeetup.com</span>
            </div>
        </main>
    )
}

export const metadata = {
    title: 'Join as an Alumni Mentor | EdUmeetup',
    description: 'You made it to the USA. Now help the next IAES student get there too. Share your journey in 3 minutes.',
}
