import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getAdminOverviewMetrics } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Calendar } from 'lucide-react'

export default async function AdminOverviewPage() {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
        // Since we don't have a specific Admin login page, redirect to root or show 403
        // Assuming current login handles Role check
        return <div className="p-8">Access Denied. Admins Only.</div>
    }

    const metrics = await getAdminOverviewMetrics()
    if (!metrics) return <div>Error loading metrics</div>

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Platform Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Universities</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalUniversities}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalStudents}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalMeetings}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Universities by Meeting Volume</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {metrics.topUnis.map((uni, idx) => (
                            <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                <div>
                                    <div className="font-medium">{uni.name}</div>
                                </div>
                                <div className="font-bold">{uni.count}</div>
                            </div>
                        ))}
                        {metrics.topUnis.length === 0 && (
                            <div className="text-gray-500 text-sm">No meeting data yet.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
