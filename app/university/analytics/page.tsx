import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BarChart, Users, Calendar, TrendingUp } from 'lucide-react'

// Dashboard is server component
export default async function UniversityAnalyticsPage() {
    const session = await auth()

    if (!session || !session.user || ((session.user as any).role !== 'UNIVERSITY' && (session.user as any).role !== 'UNIVERSITY_REP')) {
        redirect('/login')
    }

    // Get University Profile
    const uni = await prisma.university.findUnique({
        where: { userId: session.user.id },
        include: {
            events: {
                include: { registrations: { include: { student: true } } },
                orderBy: { dateTime: 'desc' } as any,
            }
        }
    })

    if (!uni) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
                    University profile not found. Please complete your profile.
                </div>
            </div>
        )
    }

    const events = (uni as any)?.events || []

    // Calculate Stats
    const totalEvents = events.length
    const totalRegistrations = events.reduce((acc: number, event: any) => acc + event.registrations.length, 0)
    const avgRegistrations = totalEvents > 0 ? (totalRegistrations / totalEvents).toFixed(1) : 0

    // Sort by popularity
    const sortedEvents = [...events].sort((a: any, b: any) => b.registrations.length - a.registrations.length)
    const topEvent = sortedEvents.length > 0 ? sortedEvents[0] : null

    // Data for simple chart (Top 5)
    const chartData = sortedEvents.slice(0, 5).map((e: any) => ({
        label: e.title,
        value: e.registrations.length,
        percent: topEvent ? (e.registrations.length / topEvent.registrations.length) * 100 : 0
    }))

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Event Analytics</h1>
                <p className="text-gray-500">Overview of your event performance and student engagement.</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-row items-center justify-between pb-4">
                        <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Calendar className="h-4 w-4 text-primary" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{totalEvents}</div>
                        <p className="text-xs text-gray-500 mt-1">Scheduled events</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-row items-center justify-between pb-4">
                        <h3 className="text-sm font-medium text-gray-500">Total Registrations</h3>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Users className="h-4 w-4 text-green-600" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{totalRegistrations}</div>
                        <p className="text-xs text-gray-500 mt-1">Student sign-ups</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-row items-center justify-between pb-4">
                        <h3 className="text-sm font-medium text-gray-500">Avg. Attendance</h3>
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <BarChart className="h-4 w-4 text-purple-600" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{avgRegistrations}</div>
                        <p className="text-xs text-gray-500 mt-1">Per event</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-row items-center justify-between pb-4">
                        <h3 className="text-sm font-medium text-gray-500">Top Event</h3>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-900 truncate" title={topEvent?.title || ''}>
                            {topEvent?.title || 'No events'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {topEvent ? `${topEvent.registrations.length} registrations` : '-'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Chart - Top Events */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-1">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Top Performing Events</h2>
                    <div className="space-y-4">
                        {chartData.map((item: any, idx: number) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700 truncate max-w-[70%]">{item.label}</span>
                                    <span className="text-gray-900 font-bold">{item.value}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-primary h-2.5 rounded-full transition-all duration-500 group-hover:bg-blue-600"
                                        style={{ width: `${item.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {chartData.length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">No data to display</p>
                        )}
                    </div>
                </div>

                {/* Event Performance Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-bold text-gray-900">Recent Events</h2>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">Event Name</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3 text-right">Registrations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {events.map((event: any) => (
                                    <tr key={event.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{event.title}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(event.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {event.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{event.registrations.length}</td>
                                    </tr>
                                ))}
                                {events.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No events found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
