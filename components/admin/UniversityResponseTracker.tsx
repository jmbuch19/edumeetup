'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Clock, XCircle, Loader2, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { sendFairInvitationReminder } from '@/app/actions/university/fair-invitation-actions'
import type { FairInvitationRow } from '@/app/actions/university/fair-invitation-actions'

interface Props {
    fairId: string
    invitations: FairInvitationRow[]
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
    CONFIRMED: <CheckCircle2 className="w-4 h-4 text-teal-600" />,
    PENDING: <Clock className="w-4 h-4 text-amber-500" />,
    DECLINED: <XCircle className="w-4 h-4 text-gray-400" />,
}

const STATUS_LABELS: Record<string, string> = {
    CONFIRMED: 'Confirmed',
    PENDING: 'Awaiting response',
    DECLINED: 'Declined',
}

export function UniversityResponseTracker({ fairId, invitations }: Props) {
    const confirmed = invitations.filter(i => i.status === 'CONFIRMED')
    const pending = invitations.filter(i => i.status === 'PENDING')
    const declined = invitations.filter(i => i.status === 'DECLINED')

    const [reminderPending, startReminder] = useTransition()

    const handleSendReminder = () => {
        startReminder(async () => {
            const res = await sendFairInvitationReminder(fairId)
            if (res.ok) {
                toast.success(`Reminder sent to ${res.sent} university/ies.`)
            } else {
                toast.error(res.error)
            }
        })
    }

    if (invitations.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-gray-400">
                    No invitations have been sent for this fair yet.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-indigo-100">
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        🏛️ University Responses
                        <span className="ml-1 text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            {invitations.length}
                        </span>
                    </CardTitle>
                    {/* Summary pills */}
                    <div className="flex gap-2 text-xs font-semibold flex-wrap">
                        <span className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed ({confirmed.length})
                        </span>
                        <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" /> Pending ({pending.length})
                        </span>
                        <span className="flex items-center gap-1 bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Declined ({declined.length})
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
                {/* Per-university rows */}
                {invitations.map(inv => (
                    <div
                        key={inv.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${inv.status === 'CONFIRMED'
                            ? 'bg-teal-50/50'
                            : inv.status === 'DECLINED'
                                ? 'bg-gray-50 opacity-60'
                                : 'bg-amber-50/30'
                            }`}
                    >
                        {STATUS_ICONS[inv.status]}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {inv.university.institutionName}
                            </p>
                            <p className="text-xs text-gray-400">
                                {STATUS_LABELS[inv.status]}
                                {inv.status === 'CONFIRMED' && inv.repsAttending
                                    ? ` · ${inv.repsAttending} rep${inv.repsAttending > 1 ? 's' : ''}`
                                    : ''}
                            </p>
                        </div>
                        {inv.status === 'CONFIRMED' && inv.programsShowcasing.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-end">
                                {inv.programsShowcasing.slice(0, 2).map(p => (
                                    <span
                                        key={p}
                                        className="text-[10px] font-semibold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full whitespace-nowrap max-w-[100px] truncate"
                                    >
                                        {p}
                                    </span>
                                ))}
                                {inv.programsShowcasing.length > 2 && (
                                    <span className="text-[10px] text-gray-400">
                                        +{inv.programsShowcasing.length - 2} more
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Remind pending */}
                {pending.length > 0 && (
                    <div className="pt-3 border-t border-gray-100">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSendReminder}
                            disabled={reminderPending}
                            className="rounded-xl gap-1.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                            {reminderPending
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Bell className="w-3.5 h-3.5" />
                            }
                            Send Reminder to {pending.length} pending
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
