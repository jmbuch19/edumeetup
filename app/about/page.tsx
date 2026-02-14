export default function About() {
  return (
    <main className="flex-1 py-12 px-4 bg-white">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">About edUmeetup</h1>
        <div className="prose lg:prose-xl mx-auto">
          <p className="mb-6 text-lg text-gray-700">
            edUmeetup is a platform designed to connect students with universities worldwide.
            We believe that every student deserves the opportunity to find the perfect educational program
            to pursue their dreams.
          </p>
          <p className="mb-6 text-lg text-gray-700">
            Our mission is to simplify the university search and application process by providing a
            transparent, direct, and efficient way for students and institutions to interact.
          </p>
          <p className="mb-6 text-lg text-gray-700">
            Founded in 2026, we have helped thousands of students find their dream destinations.
          </p>
        </div>
      </div>
    </main>
  );
}
