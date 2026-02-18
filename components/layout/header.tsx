
import Link from "next/link"
import { GraduationCap, LogOut, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { logout } from "@/app/actions"
import { prisma } from "@/lib/prisma"
import { NotificationBell } from "@/components/notifications/notification-bell"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Menu } from "lucide-react"
import { AuthButtons } from "./auth-buttons"
import { MobileLoginButton, MobileSignUpItem } from "./mobile-auth-buttons"

export async function Header() {
    const session = await auth()
    const user = session?.user

    const notifications = user ? await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10
    }) : []

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
                <nav className="hidden md:flex items-center gap-8">
                    <Link href="/universities" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                        Browse Universities
                    </Link>
                    {user?.role === 'STUDENT' && (
                        <Link href="/student/dashboard" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                            Dashboard
                        </Link>
                    )}
                    {user?.role === 'UNIVERSITY' && (
                        <Link href="/university/dashboard" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                            Dashboard
                        </Link>
                    )}
                    {user?.role === 'ADMIN' && (
                        <Link href="/admin/dashboard" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                            Admin
                        </Link>
                    )}

                    <Link href="/host-a-fair" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                        Host a Fair
                    </Link>

                    <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                        About
                    </Link>
                    <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                        Contact
                    </Link>

                </nav>

                <div className="hidden md:flex items-center gap-4">
                    {/* Admin Demo Link - Always Visible */}
                    {/* Admin Demo Link - Subtle Outline */}
                    <Link href="/admin/dashboard" className="text-xs font-medium text-slate-500 border border-dashed border-slate-300 px-3 py-1.5 rounded-md hover:text-slate-900 hover:border-slate-400 transition-all">
                        Admin Demo
                    </Link>
                    {user ? (
                        <div className="flex items-center gap-3">
                            <NotificationBell notifications={notifications} />

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
                                <Button variant="default" size="sm">
                                    Sign up
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
            {/* Mobile Menu */}
            <div className="md:hidden flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-3">
                        {/* Bell - Keep visible on mobile */}
                        <NotificationBell notifications={notifications} />

                        {/* Dashboard Quick Link - Keep visible */}
                        <Link href={
                            user.role === 'STUDENT' ? '/student/dashboard' :
                                user.role === 'UNIVERSITY' ? '/university/dashboard' :
                                    '/admin/dashboard'
                        }>
                            <Button variant="ghost" size="icon" title="Dashboard">
                                <LayoutDashboard className="h-5 w-5 text-gray-600" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <MobileLoginButton />
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href="/universities" className="w-full cursor-pointer">Browse Universities</Link>
                        </DropdownMenuItem>

                        {user?.role === 'STUDENT' && (
                            <DropdownMenuItem asChild>
                                <Link href="/student/dashboard" className="w-full cursor-pointer">Dashboard</Link>
                            </DropdownMenuItem>
                        )}
                        {user?.role === 'UNIVERSITY' && (
                            <DropdownMenuItem asChild>
                                <Link href="/university/dashboard" className="w-full cursor-pointer">Dashboard</Link>
                            </DropdownMenuItem>
                        )}
                        {user?.role === 'ADMIN' && (
                            <DropdownMenuItem asChild>
                                <Link href="/admin/dashboard" className="w-full cursor-pointer">Admin Panel</Link>
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuItem asChild>
                            <Link href="/host-a-fair" className="w-full cursor-pointer">Host a Fair</Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <Link href="/about" className="w-full cursor-pointer">About</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/contact" className="w-full cursor-pointer">Contact</Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/admin/dashboard" className="w-full cursor-pointer font-bold text-red-600">Admin Demo Panel</Link>
                        </DropdownMenuItem>

                        {!user && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <MobileSignUpItem />
                                </DropdownMenuItem>
                            </>
                        )}

                        {user && (
                            <>
                                <DropdownMenuSeparator />
                                <form action={logout} className="w-full">
                                    <button type="submit" className="w-full text-left px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-sm flex items-center gap-2">
                                        <LogOut className="h-4 w-4" />
                                        Sign Out
                                    </button>
                                </form>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header >
    )
}
