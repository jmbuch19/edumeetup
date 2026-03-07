'use client'

import { useState } from 'react'
import { User, Download, Shield, Trash2, Edit3 } from 'lucide-react'
import ViewMyDataSection from './ViewMyDataSection'
import DownloadMyDataButton from './DownloadMyDataButton'
import ConsentSettings from './ConsentSettings'
import CorrectMyDataSection from './CorrectMyDataSection'
import DeleteAccountDialog from './DeleteAccountDialog'

type Tab = 'view' | 'correct' | 'download' | 'consent' | 'delete'

interface ManageMyDataSectionProps {
    user: {
        id: string
        email: string
        name: string | null
        role: string
        createdAt: Date
        consentMarketing: boolean
        consentAnalytics: boolean
        consentWithdrawnAt: Date | null
        deletionRequestedAt: Date | null
        deletionScheduledFor: Date | null
    }
    consentHistory: Array<{
        field: string
        oldValue: boolean
        newValue: boolean
        changedAt: Date
    }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profileComponent?: React.ReactNode
    supportEmail?: string
    profileSettingsHref?: string
}

const TABS: { id: Tab; label: string; icon: React.ReactNode; danger?: boolean }[] = [
    { id: 'view', label: 'View My Data', icon: <User className="h-4 w-4" /> },
    { id: 'correct', label: 'Correct My Data', icon: <Edit3 className="h-4 w-4" /> },
    { id: 'download', label: 'Download My Data', icon: <Download className="h-4 w-4" /> },
    { id: 'consent', label: 'Consent Settings', icon: <Shield className="h-4 w-4" /> },
    { id: 'delete', label: 'Delete Account', icon: <Trash2 className="h-4 w-4" />, danger: true },
]

export default function ManageMyDataSection({ user, consentHistory, profileComponent, supportEmail, profileSettingsHref }: ManageMyDataSectionProps) {
    const [activeTab, setActiveTab] = useState<Tab>('view')

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-sky-400" />
                    Manage My Data
                </h2>
                <p className="text-slate-300 text-sm mt-1">
                    View, correct, export, or delete your personal data in compliance with GDPR.
                </p>
            </div>

            {/* Tab nav */}
            <div className="flex overflow-x-auto border-b bg-slate-50 scrollbar-hide">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === tab.id
                            ? tab.danger
                                ? 'border-red-500 text-red-600 bg-red-50'
                                : 'border-sky-600 text-sky-700 bg-white'
                            : tab.danger
                                ? 'border-transparent text-red-400 hover:text-red-600 hover:bg-red-50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
                {activeTab === 'view' && (
                    <ViewMyDataSection user={user} consentHistory={consentHistory} />
                )}
                {activeTab === 'correct' && (
                    <CorrectMyDataSection
                        profileComponent={profileComponent}
                        profileSettingsHref={profileSettingsHref}
                    />
                )}
                {activeTab === 'download' && (
                    <DownloadMyDataButton userName={user.name} />
                )}
                {activeTab === 'consent' && (
                    <ConsentSettings
                        initialMarketing={user.consentMarketing}
                        initialAnalytics={user.consentAnalytics}
                        consentWithdrawnAt={user.consentWithdrawnAt}
                        history={consentHistory}
                    />
                )}
                {activeTab === 'delete' && (
                    <DeleteAccountDialog
                        userEmail={user.email}
                        deletionRequestedAt={user.deletionRequestedAt}
                        deletionScheduledFor={user.deletionScheduledFor}
                        supportEmail={supportEmail}
                    />
                )}
            </div>
        </div>
    )
}
