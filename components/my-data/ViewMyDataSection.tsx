'use client'

import { CheckCircle, XCircle, Clock, Database } from 'lucide-react'

interface ConsentEntry {
    field: string
    oldValue: boolean
    newValue: boolean
    changedAt: Date
}

interface ViewMyDataSectionProps {
    user: {
        id: string
        email: string
        name: string | null
        role: string
        createdAt: Date
        consentMarketing: boolean
        consentAnalytics: boolean
        consentWithdrawnAt: Date | null
    }
    consentHistory: ConsentEntry[]
}

function ConsentBadge({ value }: { value: boolean }) {
    return value ? (
        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
            <CheckCircle className="h-3 w-3" /> Granted
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
            <XCircle className="h-3 w-3" /> Withdrawn
        </span>
    )
}

const DATA_CATEGORIES: Record<string, string[]> = {
    STUDENT: [
        'Account info (email, name, role)',
        'Student profile (location, preferences, test scores)',
        'CV / Resume file (stored in R2)',
        'University interests & programme matches',
        'Meetings history',
        'Advisory requests',
        'Bookmarked universities',
        'Support tickets',
        'Notifications',
        'Consent preferences & history',
    ],
    UNIVERSITY: [
        'Account info (email, name, role)',
        'University profile (institution name, country, contact)',
        'Uploaded documents & logo',
        'Programmes offered',
        'Student interest leads received',
        'Meetings history',
        'Representative accounts',
        'Support tickets',
        'Consent preferences & history',
    ],
}

export default function ViewMyDataSection({ user, consentHistory }: ViewMyDataSectionProps) {
    const categories = DATA_CATEGORIES[user.role] ?? DATA_CATEGORIES.STUDENT

    const formatDate = (d: Date | null | string) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold text-slate-800 mb-1">Account Information</h3>
                <p className="text-sm text-slate-500 mb-3">The personal data we hold about you on edUmeetup.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { label: 'Email', value: user.email },
                        { label: 'Name', value: user.name || '—' },
                        { label: 'Role', value: user.role },
                        { label: 'Member since', value: formatDate(user.createdAt) },
                    ].map(item => (
                        <div key={item.label} className="bg-slate-50 rounded-lg px-4 py-3 border">
                            <p className="text-xs text-slate-500 font-medium mb-0.5">{item.label}</p>
                            <p className="text-sm text-slate-800 font-medium">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                    <Database className="h-4 w-4 text-sky-600" />
                    Data We Hold
                </h3>
                <ul className="text-sm text-slate-600 space-y-1.5 mt-2">
                    {categories.map(cat => (
                        <li key={cat} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                            {cat}
                        </li>
                    ))}
                </ul>
            </div>

            <div>
                <h3 className="font-semibold text-slate-800 mb-3">Current Consent Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg px-4 py-3 border flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Marketing Emails</p>
                            <p className="text-xs text-slate-500">Newsletters, promotions, fair announcements</p>
                        </div>
                        <ConsentBadge value={user.consentMarketing} />
                    </div>
                    <div className="bg-slate-50 rounded-lg px-4 py-3 border flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Analytics</p>
                            <p className="text-xs text-slate-500">Usage analytics to improve the platform</p>
                        </div>
                        <ConsentBadge value={user.consentAnalytics} />
                    </div>
                </div>
                {user.consentWithdrawnAt && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        All consents withdrawn on {formatDate(user.consentWithdrawnAt)}
                    </p>
                )}
            </div>

            {consentHistory.length > 0 && (
                <div>
                    <h3 className="font-semibold text-slate-800 mb-3">Consent Change History</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Date</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Field</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Change</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {consentHistory.map((entry, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-2.5 text-slate-600 text-xs">{formatDate(entry.changedAt)}</td>
                                        <td className="px-4 py-2.5 text-slate-700">
                                            {entry.field === 'consentMarketing' ? 'Marketing' : 'Analytics'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-slate-500">
                                                {entry.oldValue ? 'Granted' : 'Withdrawn'}
                                            </span>
                                            {' → '}
                                            <span className={`text-xs font-medium ${entry.newValue ? 'text-green-600' : 'text-red-600'}`}>
                                                {entry.newValue ? 'Granted' : 'Withdrawn'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
