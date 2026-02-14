import Link from 'next/link';

export default function Universities() {
  return (
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
  );
}
