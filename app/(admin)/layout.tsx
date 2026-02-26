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
    const { signOut } = await import('@/lib/auth')
    await signOut({ redirectTo: '/' })
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    let session
    try {
        session = await auth()
    } catch (e) {
        console.error('[AdminLayout] auth() threw:', e)
        redirect('/login?error=SessionError')
    }

    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/login")
    }

    console.log('[AdminLayout] auth ok, role:', session?.user?.role)

    const adminName = session.user.name || session.user.email?.split("@")[0] || "Admin"
    const adminInitial = adminName.charAt(0).toUpperCase()
    console.log('[AdminLayout] rendering for:', adminName)

    return (
        <div className="min-h-screen bg-gray-100 flex">

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed inset-y-0">

                {/* Logo */}
                <div className="p-6 border-b border-gray-200">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="font-bold text-xl text-primary tracking-tight">edUmeetup</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Admin
                        </span>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">

                    {/* Core */}
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-1 pb-2">
                        Core
                    </p>
                    <ActiveNavItem href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <ActiveNavItem href="/admin/universities" icon={School} label="Universities" />
                    <ActiveNavItem href="/admin/users" icon={Users} label="Users" />
                    <ActiveNavItem href="/admin/meetings" icon={CalendarDays} label="Meetings" />

                    {/* Tools */}
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-2">
                        Tools
                    </p>
                    <ActiveNavItem href="/admin/engagement" icon={Megaphone} label="Engagement" />
                    <ActiveNavItem href="/admin/tickets" icon={Ticket} label="Support Tickets" />
                    <ActiveNavItem href="/admin/advisory" icon={Users} label="Advisory Requests" />
                    <ActiveNavItem href="/admin/host-requests" icon={Globe} label="Host Requests" />
                    <ActiveNavItem href="/admin/sponsored" icon={Sparkles} label="Sponsored Content" />
                    <ActiveNavItem href="/admin/reports" icon={FileBarChart2} label="Reports" />

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
