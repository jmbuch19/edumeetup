import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
    Users, School, CalendarDays, FileText,
    Clock, CheckCircle, XCircle, AlertTriangle,
    TrendingUp, Bell
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { verifyUniversity } from "@/app/actions"

export const dynamic = "force-dynamic"

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
}

async function getDashboardData() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
        totalUsers,
        totalStudents,
        verifiedUniversities,
        pendingUniversities,
        totalMeetings,
        advisoryRequests,
        recentLogs,
        oldestPending,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.student.count(),
        prisma.university.count({ where: { verificationStatus: "VERIFIED" } }),
        prisma.university.findMany({
            where: { verificationStatus: "PENDING" },
            include: { user: { select: { email: true } } },
            orderBy: { createdAt: "asc" },
        }),
        prisma.meeting.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.advisoryRequest.count({ where: { status: "NEW" } }),
        prisma.systemLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 8,
            select: { id: true, level: true, type: true, message: true, createdAt: true },
        }),
        prisma.university.findFirst({
            where: { verificationStatus: "PENDING" },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
        }),
    ])

    const oldestPendingHours = oldestPending?.createdAt
        ? Math.round((Date.now() - oldestPending.createdAt.getTime()) / (1000 * 60 * 60))
        : null

    return {
        totalUsers,
        totalStudents,
        verifiedUniversities,
        pendingUniversities,
        totalMeetings,
        advisoryRequests,
        recentLogs,
        oldestPendingHours,
    }
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    bg,
    valueColor = "text-gray-900",
    subColor = "text-gray-500",
}: {
    icon: React.ElementType
    label: string
    value: string | number
    sub?: string
    bg: string
    valueColor?: string
    subColor?: string
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</h3>
                <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
                {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
            </div>
        </div>
    )
}

export default async function AdminDashboardPage() {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

    const {
        totalUsers,
        totalStudents,
        verifiedUniversities,
        pendingUniversities,
        totalMeetings,
        advisoryRequests,
        recentLogs,
        oldestPendingHours,
    } = await getDashboardData()

    const adminName = session.user.name || session.user.email?.split("@")[0] || "Admin"

    return (
        <div className="space-y-6">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-primary to-blue-700 text-white pt-10 pb-24 px-6 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:24px_24px]" />
                <div className="relative z-10">
                    <p className="text-sm font-medium text-blue-100 mb-1">
                        {getGreeting()}, {adminName} 👋
                    </p>
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-blue-100 text-sm mt-1">
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>
            </div>

            {/* Stat Cards — pulled up to overlap the hero */}
            <div className="-mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                <StatCard icon={Users} label="Total Users" value={totalUsers} sub={`${totalStudents} students`} bg="bg-blue-50 text-blue-600" />
                <StatCard icon={School} label="Verified Unis" value={verifiedUniversities} sub={`${pendingUniversities.length} pending`} bg="bg-green-50 text-green-600" valueColor="text-green-700" />
                <StatCard icon={CalendarDays} label="Meetings (7d)" value={totalMeetings} sub="last 7 days" bg="bg-violet-50 text-violet-600" />
                <StatCard
                    icon={Bell}
                    label="Advisory (New)"
                    value={advisoryRequests}
                    sub="unassigned"
                    bg="bg-amber-50 text-amber-600"
                    valueColor={advisoryRequests > 0 ? "text-amber-700" : "text-gray-900"}
                    subColor={advisoryRequests > 0 ? "text-amber-500" : "text-gray-500"}
                />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Pending University Queue */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div>
                            <h2 className="font-semibold text-gray-800">Pending Verifications</h2>
                            {oldestPendingHours != null && (
                                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Oldest waiting {oldestPendingHours}h
                                </p>
                            )}
                        </div>
                        <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-full">
                            {pendingUniversities.length} pending
                        </span>
                    </div>

                    {pendingUniversities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <CheckCircle className="h-10 w-10 text-green-400 mb-3" />
                            <p className="text-sm font-medium text-gray-700">All caught up!</p>
                            <p className="text-xs text-gray-400 mt-1">No universities pending verification.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {pendingUniversities.map((uni) => (
                                <li key={uni.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{uni.institutionName}</p>
                                            <p className="text-xs text-gray-400 truncate">{uni.country} · {uni.user?.email}</p>
                                            <p className="text-[10px] text-gray-300 mt-0.5">
                                                {formatDistanceToNow(new Date(uni.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <form action={verifyUniversity as any}>
                                                <input type="hidden" name="universityId" value={uni.id} />
                                                <input type="hidden" name="action" value="approve" />
                                                <button type="submit" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-green-200 hover:bg-green-50 text-green-700">
                                                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                                                </button>
                                            </form>
                                            <form action={verifyUniversity as any}>
                                                <input type="hidden" name="universityId" value={uni.id} />
                                                <input type="hidden" name="action" value="reject" />
                                                <button type="submit" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 text-red-700">
                                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Activity Feed */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Recent Activity</h2>
                        <p className="text-xs text-gray-400 mt-0.5">System logs</p>
                    </div>
                    {recentLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <FileText className="h-10 w-10 text-gray-300 mb-3" />
                            <p className="text-sm text-gray-400">No recent activity.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {recentLogs.map((log) => (
                                <li key={log.id} className="px-5 py-3">
                                    <div className="flex items-start gap-2">
                                        {log.level === "ERROR" ? (
                                            <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                                        ) : log.level === "WARN" ? (
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                                        ) : (
                                            <TrendingUp className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-700 truncate">{log.message}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                {log.type} · {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
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
    )
}
