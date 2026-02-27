import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAdminOverviewMetrics } from '../overview/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Calendar, Clock, BookOpen, MapPin, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const QUICK_LINKS = [
    { href: '/admin/universities', label: 'Universities', icon: Building2, desc: 'Verify & manage institutions' },
    { href: '/admin/users', label: 'Users', icon: Users, desc: 'Manage all platform users' },
    { href: '/admin/engagement', label: 'Engagement', icon: BookOpen, desc: 'Announcements & notifications' },
    { href: '/admin/host-requests', label: 'Host Requests', icon: MapPin, desc: 'Campus fair requests' },
    { href: '/admin/advisory', label: 'Advisory', icon: Clock, desc: 'Student advisory requests' },
    { href: '/admin/overview', label: 'Full Overview', icon: Calendar, desc: 'Detailed platform stats' },
]

export default async function AdminDashboard() {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')

    const metrics = await getAdminOverviewMetrics()
    if (!metrics) return <div className="p-8 text-red-500">Failed to load metrics.</div>

    const STAT_CARDS = [
        { label: 'Total Universities', value: metrics.totalUniversities, icon: Building2, color: 'text-blue-600', urgent: false },
        { label: 'Total Students', value: metrics.totalStudents, icon: Users, color: 'text-green-600', urgent: false },
        { label: 'Total Meetings', value: metrics.totalMeetings, icon: Calendar, color: 'text-purple-600', urgent: false },
        { label: 'Pending Verifications', value: metrics.pendingVerifications, icon: Clock, color: 'text-amber-600', urgent: metrics.pendingVerifications > 0 },
        { label: 'Pending Advisory', value: metrics.pendingAdvisory, icon: BookOpen, color: 'text-indigo-600', urgent: metrics.pendingAdvisory > 0 },
        { label: 'Pending Host Requests', value: metrics.hostRequestsPending, icon: MapPin, color: 'text-rose-600', urgent: metrics.hostRequestsPending > 0 },
    ]

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-1">Platform overview and quick access to all admin tools.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {STAT_CARDS.map(({ label, value, icon: Icon, color, urgent }) => (
                    <Card key={label} className={urgent ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{label}</CardTitle>
                            <Icon className={`h-4 w-4 ${color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${urgent ? 'text-amber-600' : ''}`}>{value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Access */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Quick Access</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {QUICK_LINKS.map(({ href, label, icon: Icon, desc }) => (
                        <Link key={href} href={href}>
                            <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
                                <CardContent className="pt-5 flex items-start gap-3">
                                    <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <div className="font-semibold">{label}</div>
                                        <div className="text-xs text-muted-foreground">{desc}</div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Top Universities by Meeting Volume */}
            {metrics.topUnis.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Top Universities by Meeting Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {metrics.topUnis.map((uni, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div className="font-medium">{uni.name}</div>
                                    <div className="font-bold text-primary">{uni.count}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
