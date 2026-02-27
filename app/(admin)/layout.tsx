import Link from "next/link"
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard, Users, School, LogOut, Ticket,
    Globe, Megaphone, CalendarDays, FileBarChart2,
    Sparkles
} from "lucide-react"
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs"
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav"
import { ActiveNavItem } from "@/components/admin/active-nav-item"

// Lightweight auth — same as middleware, no PrismaAdapter, safe at module level
const { auth } = NextAuth(authConfig)

async function logout() {
    'use server'
    // Dynamic import — avoids module-level lib/auth load which crashes on cold start
    const { signOut } = await import('@/lib/auth')
    await signOut({ redirectTo: '/' })
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    let session = null
    try {
        session = await auth()
    } catch (e) {
        console.error('[AdminLayout] auth() failed:', e)
    }

    if (!session?.user) {
        redirect('/login?callbackUrl=/admin/dashboard')
    }

    if (session.user.role !== 'ADMIN') {
        redirect('/login')
    }

    const adminName = session.user.name || session.user.email?.split('@')[0] || 'Admin'
    const adminInitial = adminName.charAt(0).toUpperCase()

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 bg-white border-r border-gray-200 z-20">
                {/* Logo */}
                <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-200">
                    <Link href="/admin/dashboard" className="flex items-center gap-2">
                        <span className="font-bold text-lg text-primary">edU<span className="text-gray-800">meetup</span></span>
                        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">ADMIN</span>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">Main</p>
                    <ActiveNavItem href="/admin/dashboard" iconNode={<LayoutDashboard className="h-5 w-5 shrink-0" />} label="Dashboard" />
                    <ActiveNavItem href="/admin/users" iconNode={<Users className="h-5 w-5 shrink-0" />} label="Users" />
                    <ActiveNavItem href="/admin/universities" iconNode={<School className="h-5 w-5 shrink-0" />} label="Universities" />

                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1">Operations</p>
                    <ActiveNavItem href="/admin/advisory" iconNode={<Users className="h-5 w-5 shrink-0" />} label="Advisory Requests" />
                    <ActiveNavItem href="/admin/host-requests" iconNode={<Globe className="h-5 w-5 shrink-0" />} label="Host Requests" />
                    <ActiveNavItem href="/admin/engagement" iconNode={<Megaphone className="h-5 w-5 shrink-0" />} label="Engagement" />

                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1">Insights</p>
                    <ActiveNavItem href="/admin/overview" iconNode={<CalendarDays className="h-5 w-5 shrink-0" />} label="Overview" />
                    <ActiveNavItem href="/admin/reports" iconNode={<FileBarChart2 className="h-5 w-5 shrink-0" />} label="Reports" />
                    <ActiveNavItem href="/admin/engagement" iconNode={<Sparkles className="h-5 w-5 shrink-0" />} label="Sponsored Content" />
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 mb-4 px-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {adminInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate capitalize">{adminName}</p>
                            <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                        </div>
                    </div>
                    <form action={logout}>
                        <Button variant="outline" className="w-full justify-start gap-2" type="submit">
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Mobile nav */}
            <AdminMobileNav adminEmail={session.user?.email} />

            {/* Main content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 min-w-0">
                <AdminBreadcrumbs />
                {children}
            </main>
        </div>
    )
}
