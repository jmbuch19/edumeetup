
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, School, LogOut, Ticket, LucideIcon, Globe } from "lucide-react"
import { logout } from "@/app/actions"
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs"
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed inset-y-0">
                <div className="p-6 border-b border-gray-200">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="font-bold text-xl text-primary tracking-tight">edUmeetup</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Admin</span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <NavItem href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem href="/admin/universities" icon={School} label="Universities" />
                    <NavItem href="/admin/users" icon={Users} label="Users" />
                    <NavItem href="/admin/tickets" icon={Ticket} label="Support Tickets" />
                    <NavItem href="/admin/advisory" icon={Users} label="Advisory Requests" />
                    <NavItem href="/admin/host-requests" icon={Globe} label="Host Requests" />
                    {/* <NavItem href="/admin/settings" icon={Settings} label="Settings" /> */}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 mb-4 px-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            A
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
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

            {/* Mobile nav — hamburger + drawer */}
            <AdminMobileNav adminEmail={session.user?.email} />

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 min-w-0">
                <AdminBreadcrumbs />
                {children}
            </main>
        </div>
    )
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-primary transition-colors">
            <Icon className="h-5 w-5" />
            {label}
        </Link>
    )
}
