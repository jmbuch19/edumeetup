import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, TrendingUp, Clock, AlertCircle } from "lucide-react"

interface DashboardStatsProps {
    stats?: {
        totalPrograms?: number
        totalInterests?: number
        totalMeetings?: number
        totalStudentsMatched?: number
        acceptanceRate?: number
    }
    meetingCount?: number
    pendingInterests?: number
    responseRate?: number | null
    awaitingResponse?: number
}

export function DashboardStats({
    stats,
    meetingCount,
    pendingInterests,
    responseRate,
    awaitingResponse = 0,
}: DashboardStatsProps) {
    const rate = responseRate ?? null
    const rateColor = rate === null ? 'text-gray-400'
        : rate >= 80 ? 'text-green-600'
        : rate >= 60 ? 'text-amber-600'
        : 'text-red-600'
    const rateBg = rate === null ? 'bg-gray-50'
        : rate >= 80 ? 'bg-green-50'
        : rate >= 60 ? 'bg-amber-50'
        : 'bg-red-50'

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

            {/* 1 — Total Interests */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Interests</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalInterests ?? 0}</div>
                    <p className="text-xs text-muted-foreground">{stats?.totalPrograms ?? 0} programmes listed</p>
                </CardContent>
            </Card>

            {/* 2 — Upcoming Meetings */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{meetingCount ?? 0}</div>
                    <p className="text-xs text-muted-foreground">{stats?.totalMeetings ?? 0} all time</p>
                </CardContent>
            </Card>

            {/* 3 — Matched Students */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Matched Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalStudentsMatched ?? 0}</div>
                    <p className="text-xs text-muted-foreground">Fit your programmes</p>
                </CardContent>
            </Card>

            {/* 4 — Response Rate (agent-powered) */}
            <Card className={rateBg}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                    <TrendingUp className={`h-4 w-4 ${rateColor}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${rateColor}`}>
                        {rate !== null ? `${rate}%` : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">Platform avg: 67%</p>
                </CardContent>
            </Card>

            {/* 5 — Awaiting Reply (urgency) */}
            <Card className={awaitingResponse > 0 ? 'bg-amber-50 border-amber-200' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Awaiting Reply</CardTitle>
                    <AlertCircle className={`h-4 w-4 ${awaitingResponse > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${awaitingResponse > 0 ? 'text-amber-600' : ''}`}>
                        {awaitingResponse}
                    </div>
                    <p className="text-xs text-muted-foreground">No reply in 48h+</p>
                </CardContent>
            </Card>

        </div>
    )
}
