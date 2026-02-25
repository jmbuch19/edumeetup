import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UniversityMobileNav } from '@/components/university/university-mobile-nav'

const navItems = [
    { href: '/university/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { href: '/university/analytics', label: 'Analytics', icon: 'BarChart3' },
    { href: '/university/availability', label: 'Availability', icon: 'Clock' },
    { href: '/university/meetings', label: 'Meetings', icon: 'Users' },
    { href: '/university/fairs', label: 'Campus Fairs', icon: 'Calendar' },
]

export default async function UniversityLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session || ((session.user as any).role !== 'UNIVERSITY' && (session.user as any).role !== 'UNIVERSITY_REP')) {
        redirect('/login')
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Desktop Sidebar */}
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
                                {item.label}
                            </Link>
                        </Button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Mobile header + hamburger nav */}
                <UniversityMobileNav navItems={navItems} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
