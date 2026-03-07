'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Shield, Loader2, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface ConsentEntry {
    field: string
    oldValue: boolean
    newValue: boolean
    changedAt: Date
}

interface ConsentSettingsProps {
    initialMarketing: boolean
    initialAnalytics: boolean
    consentWithdrawnAt: Date | null
    history: ConsentEntry[]
}

export default function ConsentSettings({
    initialMarketing,
    initialAnalytics,
    consentWithdrawnAt,
    history,
}: ConsentSettingsProps) {
    const [marketing, setMarketing] = useState(initialMarketing)
    const [analytics, setAnalytics] = useState(initialAnalytics)
    const [isSaving, setIsSaving] = useState(false)

    const hasChanges = marketing !== initialMarketing || analytics !== initialAnalytics

    async function handleSave() {
        setIsSaving(true)
        try {
            const res = await fetch('/api/my-data/consent', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consentMarketing: marketing, consentAnalytics: analytics }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to save consent')
            toast.success('Consent preferences saved.')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const formatDate = (d: Date | string) =>
        new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    // Per-toggle last-changed date from history (history is already desc-sorted)
    const marketingLastChanged = history.find(e => e.field === 'consentMarketing')?.changedAt
    const analyticsLastChanged = history.find(e => e.field === 'consentAnalytics')?.changedAt

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-sky-600" />
                    Consent Preferences
                </h3>
                <p className="text-sm text-slate-500">
                    Control how we use your data. Transactional emails (magic links, meeting reminders, support)
                    are always sent regardless of these settings.
                </p>
            </div>

            <div className="space-y-4">
                {/* Marketing */}
                <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <Label htmlFor="consent-marketing" className="font-medium text-slate-800 cursor-pointer">
                                Marketing Emails
                            </Label>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Newsletters, platform announcements, university fair invites, and promotional content.
                            </p>
                        </div>
                        <Switch
                            id="consent-marketing"
                            checked={marketing}
                            disabled={isSaving}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarketing(e.target.checked)}
                            className="flex-shrink-0 mt-0.5"
                        />
                    </div>
                    {marketingLastChanged && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last changed: {formatDate(marketingLastChanged)}
                        </p>
                    )}
                </div>

                {/* Analytics */}
                <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <Label htmlFor="consent-analytics" className="font-medium text-slate-800 cursor-pointer">
                                Platform Analytics
                            </Label>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Anonymised usage data to help us improve the platform experience for all users.
                            </p>
                        </div>
                        <Switch
                            id="consent-analytics"
                            checked={analytics}
                            disabled={isSaving}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalytics(e.target.checked)}
                            className="flex-shrink-0 mt-0.5"
                        />
                    </div>
                    {analyticsLastChanged && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last changed: {formatDate(analyticsLastChanged)}
                        </p>
                    )}
                </div>
            </div>

            {consentWithdrawnAt && !marketing && !analytics && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    All consent withdrawn on {new Date(consentWithdrawnAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                </div>
            )}

            <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="flex items-center gap-2">
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Preferences'}
            </Button>
        </div>
    )
}
