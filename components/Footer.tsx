import Link from 'next/link';

export default function Footer() {
  return (
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
  );
}
