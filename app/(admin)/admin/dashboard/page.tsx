import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { verifyUniversity } from "@/app/actions"
import {
    CheckCircle, XCircle, Globe, Clock,
    Users, School, TrendingUp, Bell,
    AlertTriangle
} from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { formatDistanceToNow, differenceInHours } from "date-fns"

export const dynamic = "force-dynamic"

// ── Data fetching ────────────────────────────────────────────────────────────

async function getDashboardData() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const now = new Date()

    // Defensive wrapper — a failed query never crashes the dashboard
    async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
        try { return await fn() } catch { return fallback }
    }

    const [
        totalStudents,
        newStudentsThisWeek,
        totalUniversities,
        verifiedUniversities,
        pendingUniversities,
        totalInterests,
        totalMeetings,
        pendingList,
        recentActivity,
    ] = await Promise.all([
        safe(() => prisma.student.count(), 0),
        safe(() => prisma.student.count({ where: { createdAt: { gte: oneWeekAgo } } }), 0),
        safe(() => prisma.university.count(), 0),
        safe(() => prisma.university.count({ where: { verificationStatus: "VERIFIED" } }), 0),
        safe(() => prisma.university.count({ where: { verificationStatus: "PENDING" } }), 0),
        safe(() => prisma.interest.count(), 0),
        safe(() => prisma.meeting.count(), 0),

        // Pending universities — oldest first
        safe(() => prisma.university.findMany({
            where: { verificationStatus: "PENDING" },
            include: { user: true },
            orderBy: { createdAt: "asc" },
        }), []),

        // Audit log — falls back to [] if table missing in production
        safe(() => prisma.auditLog.findMany({
            take: 8,
            orderBy: { createdAt: "desc" },
            include: { actor: { select: { email: true, role: true } } },
        }), []),
    ])

    const oldestPendingHours = (pendingList as any[]).length > 0 && (pendingList as any[])[0].createdAt
        ? differenceInHours(now, new Date((pendingList as any[])[0].createdAt))
        : null

    return {
        stats: {
            totalStudents,
            newStudentsThisWeek,
            totalUniversities,
            verifiedUniversities,
            pendingUniversities,
            oldestPendingHours,
            totalInterests,
            totalMeetings,
        },
        pendingList,
        recentActivity,
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
}

function getActivityIcon(action: string) {
    if (action.includes("VERIFY") || action.includes("APPROVE")) return "✅"
    if (action.includes("REJECT")) return "❌"
    if (action.includes("DELETE")) return "🗑️"
    if (action.includes("CREATE") || action.includes("REGISTER")) return "🎓"
    if (action.includes("MEETING")) return "📅"
    if (action.includes("TICKET")) return "🎫"
    return "📋"
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

    const { stats, pendingList, recentActivity } = await getDashboardData()

    const adminName = session.user.name || session.user.email?.split("@")[0] || "Admin"
    const greeting = getGreeting()

    const alerts: string[] = []
    if (stats.pendingUniversities > 0)
        alerts.push(`${stats.pendingUniversities} pending verification${stats.pendingUniversities > 1 ? "s" : ""}`)
    if (stats.oldestPendingHours && stats.oldestPendingHours > 48)
        alerts.push(`oldest pending ${Math.floor(stats.oldestPendingHours / 24)} days`)

    const contextualMessage = alerts.length > 0
        ? `You have ${alerts.join(" and ")}.`
        : "Everything looks good — all caught up!"

    return (
        <div className="min-h-screen bg-gray-50/50">

            {/* ── Hero banner ───────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-primary to-blue-700 text-white pt-10 pb-24 px-4 rounded-xl mb-8">
                <div className="container mx-auto">
                    <p className="text-blue-200 text-sm mb-1">{greeting},</p>
                    <h1 className="text-3xl font-bold mb-1 capitalize">{adminName} 👋</h1>
                    <p className="text-blue-100 opacity-90">{contextualMessage}</p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-16 pb-12 space-y-10">

                {/* ── Stats cards ───────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    <StatCard
                        icon={<Users className="h-5 w-5 text-blue-600" />}
                        bg="bg-blue-50"
                        label="Total Students"
                        value={stats.totalStudents}
                        sub={stats.newStudentsThisWeek > 0 ? `+${stats.newStudentsThisWeek} this week` : "No new this week"}
                        subColor={stats.newStudentsThisWeek > 0 ? "text-green-600" : "text-gray-400"}
                    />

                    <StatCard
                        icon={<School className="h-5 w-5 text-purple-600" />}
                        bg="bg-purple-50"
                        label="Universities"
                        value={stats.totalUniversities}
                        sub={`${stats.verifiedUniversities} verified`}
                        subColor="text-green-600"
                    />

                    <StatCard
                        icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
                        bg="bg-yellow-50"
                        label="Pending"
                        value={stats.pendingUniversities}
                        sub={
                            stats.oldestPendingHours != null
                                ? stats.oldestPendingHours > 48
                                    ? `Oldest: ${Math.floor(stats.oldestPendingHours / 24)}d ⚠️`
                                    : `Oldest: ${stats.oldestPendingHours}h`
                                : "None waiting"
                        }
                        subColor={stats.oldestPendingHours != null && stats.oldestPendingHours > 48 ? "text-red-500" : "text-gray-500"}
                        valueColor="text-yellow-600"
                    />

                    <StatCard
                        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                        bg="bg-green-50"
                        label="Interests"
                        value={stats.totalInterests}
                        sub={`${stats.totalMeetings} meetings booked`}
                        subColor="text-blue-600"
                    />

                </div>

                {/* ── Two column layout: Queue + Activity ───────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Pending verifications — 2/3 width */}
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            Pending Verifications
                            {stats.pendingUniversities > 0 && (
                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                                    {stats.pendingUniversities} waiting
                                </span>
                            )}
                        </h2>

                        {pendingList.length === 0 ? (
                            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center shadow-sm">
                                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                                <p className="text-gray-500 text-sm">No pending verification requests.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiting</th>
                                            <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {pendingList.map((uni: any) => {
                                            const hoursWaiting = uni.createdAt
                                                ? differenceInHours(new Date(), new Date(uni.createdAt))
                                                : 0
                                            const isUrgent = hoursWaiting > 48
                                            return (
                                                <tr key={uni.id} className="hover:bg-gray-50">
                                                    <td className="px-5 py-4">
                                                        <div className="text-sm font-medium text-gray-900">{uni.institutionName}</div>
                                                        <div className="text-xs text-gray-500">{uni.city}, {uni.country}</div>
                                                        {uni.website && (
                                                            <a href={uni.website} target="_blank" rel="noreferrer"
                                                                className="text-primary hover:underline flex items-center gap-1 text-xs mt-0.5">
                                                                <Globe className="h-3 w-3" /> Visit site
                                                            </a>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="text-xs text-gray-700">{uni.contactEmail || uni.user.email}</div>
                                                        {uni.repName && <div className="text-xs text-gray-500">{uni.repName}</div>}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isUrgent
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-gray-100 text-gray-600"
                                                            }`}>
                                                            <Clock className="h-3 w-3" />
                                                            {isUrgent
                                                                ? `${Math.floor(hoursWaiting / 24)}d overdue`
                                                                : `${hoursWaiting}h ago`}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <form action={verifyUniversity as any}>
                                                                <input type="hidden" name="universityId" value={uni.id} />
                                                                <input type="hidden" name="action" value="approve" />
                                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs">
                                                                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                                                                </Button>
                                                            </form>
                                                            <form action={verifyUniversity as any}>
                                                                <input type="hidden" name="universityId" value={uni.id} />
                                                                <input type="hidden" name="action" value="reject" />
                                                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1 text-xs">
                                                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                                                </Button>
                                                            </form>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Activity feed — 1/3 width */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Bell className="h-5 w-5 text-primary" />
                            Recent Activity
                        </h2>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {recentActivity.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-gray-400 text-sm">No activity yet.</p>
                                    <p className="text-gray-300 text-xs mt-1">Actions will appear here.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {(recentActivity as any[]).map((log: any) => (
                                        <li key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <span className="text-base mt-0.5">{getActivityIcon(log.action ?? log.type ?? '')}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-800 truncate">
                                                        {(log.action ?? log.type ?? 'Event').replace(/_/g, " ")}
                                                    </p>
                                                    {log.message && (
                                                        <p className="text-xs text-gray-500 truncate">{log.message}</p>
                                                    )}
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {log.actor?.email ?? log.user?.email ?? "System"}
                                                    </p>
                                                    <p className="text-[10px] text-gray-300 mt-0.5">
                                                        {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : 'Unknown time'}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

// ── Reusable stat card ────────────────────────────────────────────────────────

function StatCard({
    icon, bg, label, value, sub, subColor, valueColor = "text-gray-900"
}: {
    icon: React.ReactNode
    bg: string
    label: string
    value: number
    sub: string
    subColor: string
    valueColor?: string
}) {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                    {icon}
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</h3>
            </div>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
            <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>
        </div>
    )
}
