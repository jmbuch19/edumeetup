import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">edUmeetup</Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/universities" className="text-sm font-medium hover:underline">Browse Universities</Link>
          <Link href="/about" className="text-sm font-medium hover:underline">About</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:underline">Log in</Link>
          <Link href="/student/register" className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800">Sign up</Link>
        </div>
      </div>
    </header>
  );
}
