import { getUniversityMetrics } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default async function DashboardMetrics() {
    const metrics = await getUniversityMetrics()
    if (!metrics) return <div>Loading...</div>

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.pendingRequests}</div>
                    <p className="text-xs text-muted-foreground">Requires action</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Coming Up Today</CardTitle>
                    <Calendar className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.upcomingToday}</div>
                    <p className="text-xs text-muted-foreground">Scheduled meetings</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Meetings this Week</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.meetingsThisWeek}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.cancellationRate}%</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.noShowRate}%</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
            </Card>
        </div>
    )
}
