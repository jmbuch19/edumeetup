import Link from 'next/link';

export default function Home() {
  return (
      <main className="flex-1">
        <section className="py-24 px-4 text-center bg-gray-50">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              WHERE DREAMS MEET DESTINATIONS
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Connect directly with universities worldwide. Find your perfect program and start your journey today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/student/register" className="bg-black text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-gray-800">
                I'm a Student
              </Link>
              <Link href="/university/register" className="bg-white text-black border border-gray-300 px-8 py-3 rounded-md text-lg font-medium hover:bg-gray-50">
                I'm a University
              </Link>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-16">How it Works</h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Create Profile</h3>
                <p className="text-gray-600">Students create profiles with their preferences. Universities list their programs.</p>
              </div>
              <div className="text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Browse & Match</h3>
                <p className="text-gray-600">Students browse verified universities and find their perfect match based on interests.</p>
              </div>
              <div className="text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Connect</h3>
                <p className="text-gray-600">Express interest with one click. Universities review and connect directly via email.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
  );
}
