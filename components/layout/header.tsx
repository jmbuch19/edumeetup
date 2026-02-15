
import Link from "next/link"
import { GraduationCap, LogOut, User as UserIcon, LayoutDashboard, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/auth"
import { logout } from "@/app/actions"

export async function Header() {
    const user = await getSession()

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

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    <Link href="/universities" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                        Browse Universities
                    </Link>
                    {user?.role === 'STUDENT' && (
                        <Link href="/student/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                            Dashboard
                        </Link>
                    )}
                    {user?.role === 'UNIVERSITY' && (
                        <Link href="/university/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                            Dashboard
                        </Link>
                    )}
                    {user?.role === 'ADMIN' && (
                        <Link href="/admin/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                            Admin
                        </Link>
                    )}

                    <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                        About
                    </Link>
                    <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                        Contact
                    </Link>
                </nav>

                {/* Auth Buttons */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 hidden md:inline-block">
                                {user.email}
                            </span>

                            {/* Dashboard Icon Link for Mobile/Quick Access */}
                            <Link href={
                                user.role === 'STUDENT' ? '/student/dashboard' :
                                    user.role === 'UNIVERSITY' ? '/university/dashboard' :
                                        '/admin/dashboard'
                            }>
                                <Button variant="ghost" size="icon" title="Dashboard">
                                    <LayoutDashboard className="h-5 w-5 text-gray-600" />
                                </Button>
                            </Link>

                            <form action={logout}>
                                <Button variant="ghost" size="icon" title="Sign Out">
                                    <LogOut className="h-5 w-5 text-red-500" />
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}
