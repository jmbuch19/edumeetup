import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, School, Globe } from "lucide-react";

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
              I'm a Student
            </Button>
          </Link>
          <Link href="/university/register" className="w-full">
            <Button size="lg" variant="outline" className="w-full text-lg h-14 gap-2">
              <School className="h-5 w-5" />
              I'm a University
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          <Link href="/universities">
            <Button variant="link" className="text-primary text-lg font-medium">
              🔍 Browse All Universities &rarr;
            </Button>
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section className="w-full py-20 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
              <div className="bg-primary/10 p-4 rounded-full mb-6">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Profile</h3>
              <p className="text-gray-600">
                Students create profiles with their preferences. Universities list their programs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
              <div className="bg-primary/10 p-4 rounded-full mb-6">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Browse & Match</h3>
              <p className="text-gray-600">
                Students browse verified universities and find their perfect match based on interests.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
              <div className="bg-primary/10 p-4 rounded-full mb-6">
                <ArrowRight className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect</h3>
              <p className="text-gray-600">
                Express interest with one click. Universities review and connect directly via email.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
