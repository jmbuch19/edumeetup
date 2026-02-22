import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, ChevronDown, ChevronUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
    fullName: 'Full Name',
    city: 'City',
    pincode: 'PIN Code',
    phone: 'Phone Number',
    whatsappNumber: 'WhatsApp Number',
    ageGroup: 'Age Group',
    currentStatus: 'Education Status',
    fieldOfInterest: 'Field of Interest',
    preferredDegree: 'Preferred Degree',
    budgetRange: 'Budget Range',
    englishTestType: 'English Test',
    englishScore: 'English Score',
    greScore: 'GRE Score',
    gmatScore: 'GMAT Score',
    preferredIntake: 'Preferred Intake',
    preferredCountries: 'Preferred Countries',
}

function formatVal(val: string | null | undefined): string {
    if (!val || val === '') return '—'
    return val
}

export default async function ProfileHistoryPage() {
    const user = await requireUser()

    if (user.role !== 'STUDENT') redirect('/')

    const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: {
            changeLogs: {
                orderBy: { version: 'desc' },
            }
        }
    })

    if (!student) redirect('/student/profile')

    const logs = student.changeLogs

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <Link
                    href="/student/profile"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Profile
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Profile Change History</h1>
            <p className="text-sm text-muted-foreground mb-8">
                Every time you save your profile, a version is logged here. Your latest version (v{student.profileVersion}) is what universities and advisors see.
            </p>

            {logs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No change history yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Once you update and save your profile, your history will appear here.
                    </p>
                    <Link
                        href="/student/profile"
                        className="mt-4 inline-block text-sm text-primary hover:underline"
                    >
                        Go to Profile →
                    </Link>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden />

                    <div className="space-y-6">
                        {logs.map((log, idx) => {
                            const changedFields = log.changedFields as Record<string, { from: string | null; to: string | null }>
                            const snapshot = log.snapshot as Record<string, string | null>
                            const changedKeys = Object.keys(changedFields)
                            const isLatest = idx === 0

                            return (
                                <details key={log.id} open={isLatest} className="group relative">
                                    {/* Timeline dot */}
                                    <div
                                        className={`absolute left-3.5 top-4 h-3 w-3 rounded-full border-2 ${isLatest
                                            ? 'bg-primary border-primary'
                                            : 'bg-white border-gray-400'
                                            }`}
                                    />

                                    <summary className="ml-10 flex items-start justify-between cursor-pointer list-none rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-semibold ${isLatest ? 'text-primary' : 'text-gray-700'}`}>
                                                    Version {log.version}
                                                </span>
                                                {isLatest && (
                                                    <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {new Date(log.changedAt).toLocaleString('en-IN', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                                <span>·</span>
                                                <span>{changedKeys.length} field{changedKeys.length !== 1 ? 's' : ''} changed</span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 mt-1">
                                            <ChevronDown className="h-4 w-4 text-gray-400 group-open:hidden" />
                                            <ChevronUp className="h-4 w-4 text-gray-400 hidden group-open:block" />
                                        </div>
                                    </summary>

                                    <div className="ml-10 mt-2 rounded-xl border border-gray-100 bg-white overflow-hidden">
                                        {/* Changed fields */}
                                        {changedKeys.length > 0 && (
                                            <div className="p-4 border-b border-gray-100">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                                    What changed
                                                </p>
                                                <div className="space-y-2">
                                                    {changedKeys.map(field => {
                                                        const { from, to } = changedFields[field]
                                                        return (
                                                            <div key={field} className="grid grid-cols-[180px_1fr] gap-2 text-sm">
                                                                <span className="font-medium text-gray-700 truncate">
                                                                    {FIELD_LABELS[field] ?? field}
                                                                </span>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="line-through text-red-500/80 bg-red-50 px-1.5 py-0.5 rounded text-xs">
                                                                        {formatVal(from)}
                                                                    </span>
                                                                    <span className="text-gray-400 text-xs">→</span>
                                                                    <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-xs font-medium">
                                                                        {formatVal(to)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Full snapshot */}
                                        <div className="p-4">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                                Full profile at this version
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                                                {Object.entries(snapshot).map(([field, val]) => (
                                                    <div key={field} className="flex justify-between text-sm border-b border-gray-50 py-1">
                                                        <span className="text-gray-500">{FIELD_LABELS[field] ?? field}</span>
                                                        <span className="font-medium text-gray-800 text-right">{formatVal(val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
