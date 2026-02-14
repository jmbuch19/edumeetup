import Link from 'next/link';

export default function Universities() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">edUmeetup</Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/universities" className="text-sm font-medium hover:underline text-black">Browse Universities</Link>
            <Link href="/about" className="text-sm font-medium hover:underline">About</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:underline">Log in</Link>
            <Link href="/student/register" className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800">Sign up</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold">Browse Universities</h1>
            <button className="text-sm font-medium border border-gray-300 bg-white px-4 py-2 rounded-md hover:bg-gray-50">
              Partner with us
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search universities..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black bg-white">
                  <option>All Countries</option>
                  <option>USA</option>
                  <option>UK</option>
                  <option>Canada</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="w-full bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800">
                  Filter Results
                </button>
              </div>
            </div>
          </div>

          {/* University List */}
          <div className="space-y-4">
            {/* Mock Item */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">Global Tech University</h2>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">Verified</span>
                </div>
                <div className="text-gray-600 mb-2">San Francisco, USA</div>
                <div className="text-sm text-gray-500">2 Programs Available</div>
              </div>
              <button className="bg-white text-black border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50">
                View Details
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">edUmeetup</h3>
            <p className="text-gray-400 text-sm">Connecting students with universities worldwide. Where dreams meet destinations.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/universities" className="hover:text-white">Browse Universities</Link></li>
              <li><Link href="/student/register" className="hover:text-white">For Students</Link></li>
              <li><Link href="/university/register" className="hover:text-white">For Universities</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>jaydeep@edumeetup.com</li>
              <li>@jaydeep</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>&copy; 2026 edUmeetup. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
