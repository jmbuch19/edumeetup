'use client'

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, School } from "lucide-react";
import { HowItWorks } from "@/components/home/how-it-works";

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
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center text-center px-4 relative">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary mb-4">
          WHERE DREAMS MEET DESTINATIONS
        </h1>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-6">
          Guidance. Exposure. Direction.
        </h2>
        <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mb-10">
          edUmeetup brings students, mentors & institutions together — online & on ground.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
          <Button
            size="lg"
            className="w-full text-lg h-14 gap-2"
            onClick={() => scrollToHowItWorks('student')}
          >
            <User className="h-5 w-5" />
            I&apos;m a Student
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full text-lg h-14 gap-2"
            onClick={() => scrollToHowItWorks('university')}
          >
            <School className="h-5 w-5" />
            I&apos;m a University
          </Button>
        </div>

        <div className="mt-8 flex flex-col gap-2 items-center">
          <Link href="/universities">
            <Button variant="link" className="text-primary text-lg font-medium">
              🔍 Browse All Universities &rarr;
            </Button>
          </Link>
        </div>
      </section >

      {/* Fixed Admin Login Button (Bottom Right, left of Chat Widget) */}
      <div className="fixed bottom-6 right-24 z-40 hidden md:block">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="sm" className="text-muted-foreground opacity-50 hover:opacity-100 transition-opacity">
            🔐 Admin Login
          </Button>
        </Link>
      </div>

      <HowItWorks activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Context-Aware Sticky Bar (Fix 5) */}
      {
        activeTab === 'university' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50 animate-in slide-in-from-bottom-5">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full hidden sm:block">
                  <School className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Viewing as University</p>
                  <p className="text-sm text-gray-500">Join verified institutions recruiting directly.</p>
                </div>
              </div>
              <Link href="/university/register">
                <Button size="lg" className="w-full sm:w-auto gap-2 shadow-sm">
                  Register Your University <span className="ml-2">&rarr;</span>
                </Button>
              </Link>
            </div>
          </div>
        )
      }
    </div >
  );
}

