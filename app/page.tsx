'use client'
// Force Vercel Rebuild

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, School, ArrowRight } from "lucide-react";
import { HowItWorks } from "@/components/home/how-it-works";
import { HeroFeatures } from "@/components/hero-features";
import { motion } from "framer-motion";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'student' | 'university'>('student');

  const scrollToHowItWorks = (tab: 'student' | 'university') => {
    setActiveTab(tab);
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
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
              edUmeetup brings students, mentors, and top-tier institutions together.
              Guidance, exposure, and direction—all in one place.
            </p>
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

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/universities">
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                initial={{ width: "auto" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="font-medium text-slate-600 group-hover:text-primary">Browse Universities</span>
                <motion.span
                  initial={{ opacity: 0, x: -10, width: 0 }}
                  whileHover={{ opacity: 1, x: 0, width: "auto" }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ArrowRight className="h-4 w-4 text-primary" />
                </motion.span>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Right Column: Visual (Abstract Illustration Placeholder) */}
        <div className="relative h-full min-h-[400px] w-full hidden md:flex items-center justify-center animate-in fade-in duration-700 delay-200">
          {/* Abstract Decorative Elements */}
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

            <Link href="/host-a-fair" className="col-span-2 mx-auto">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-purple-100 flex items-center gap-4 hover:scale-105 transition-transform cursor-pointer">
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🇮🇳</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Host a Fair in India</p>
                  <p className="text-xs text-slate-500">For Indian Institutions</p>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-600 ml-2" />
              </div>
            </Link>
          </div>
        </div>

      </section >

      {/* Hero Features Accordion */}
      <section className="w-full pb-12 md:pb-24">
        <HeroFeatures />
      </section>

      <HowItWorks activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Context-Aware Sticky Bar (Refined) */}
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
    </div >
  );
}

