import Link from "next/link"
import { GraduationCap } from "lucide-react" // Logo icon
import { Button } from "@/components/ui/button"

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="bg-primary p-1.5 rounded-lg">
                        <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-bold text-xl text-primary tracking-tight">edUmeetup</span>
                </Link>

                {/* Desktop Nav - Placeholder for now, will be dynamic based on auth later */}
                <nav className="hidden md:flex items-center gap-6">
                    <Link href="/universities" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                        Browse Universities
                    </Link>
                    <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                        About
                    </Link>
                </nav>

                {/* Auth Buttons */}
                <div className="flex items-center gap-3">
                    <Link href="/login">
                        <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                            Log in
                        </Button>
                    </Link>
                    <Link href="/student/register">
                        <Button variant="primary" size="sm">
                            Sign up
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    )
}
