import Link from 'next/link'
import { LayoutDashboard, Calendar, BarChart3, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function UniversityLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session || (session.user as any).role !== 'UNIVERSITY') {
        redirect('/login')
    }

    const navItems = [
        { href: '/university/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/university/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/university/availability', label: 'Availability', icon: Clock },
        { href: '/university/meetings', label: 'Meetings', icon: Users },
        { href: '/university/fairs', label: 'Campus Fairs', icon: Calendar },
    ]

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="hidden w-64 flex-col bg-white border-r border-gray-200 md:flex">
                <div className="flex h-16 items-center border-b border-gray-200 px-6">
                    <span className="text-lg font-bold text-primary">University Portal</span>
                </div>
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => (
                        <Button
                            key={item.href}
                            variant="ghost"
                            className="w-full justify-start gap-3"
                            asChild
                        >
                            <Link href={item.href}>
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        </Button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 md:hidden">
                    <span className="text-lg font-bold">University Portal</span>
                    {/* Mobile menu could go here */}
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
