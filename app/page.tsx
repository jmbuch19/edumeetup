import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, School } from "lucide-react";
import { HowItWorks } from "@/components/home/how-it-works";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center text-center px-4">
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
          <Link href="/student/register" className="w-full">
            <Button size="lg" className="w-full text-lg h-14 gap-2">
              <User className="h-5 w-5" />
              I&apos;m a Student
            </Button>
          </Link>
          <Link href="/university/register" className="w-full">
            <Button size="lg" variant="outline" className="w-full text-lg h-14 gap-2">
              <School className="h-5 w-5" />
              I&apos;m a University
            </Button>
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-2 items-center">
          <Link href="/universities">
            <Button variant="link" className="text-primary text-lg font-medium">
              🔍 Browse All Universities &rarr;
            </Button>
          </Link>
          <Link href="/admin/dashboard">
            <Button variant="ghost" className="text-muted-foreground text-sm">
              🔐 Admin Login
            </Button>
          </Link>
        </div>
      </section >

      <HowItWorks />
    </div>
  );
}

