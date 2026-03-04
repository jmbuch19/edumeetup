'use client'

/**
 * FairReportCard — dismissable "recently ended fair" summary card.
 * Dismiss is session-only (useState, no localStorage).
 */

import { useState } from 'react'
import Link from 'next/link'
import { X, FileText, ChevronRight } from 'lucide-react'

interface Props {
    fairName: string
    fairId: string
    leadCount: number
    endedAt: string
}

export function FairReportCard({ fairName, fairId, leadCount, endedAt }: Props) {
    const [dismissed, setDismissed] = useState(false)
    if (dismissed) return null

    const endedDate = new Date(endedAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    })

    return (
        <div className="relative bg-white rounded-2xl border-l-4 border-indigo-500 shadow-sm p-5 pr-10">
            {/* Dismiss */}
            <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Fair Report Ready
                    </p>
                    <p className="text-base font-bold text-gray-900 truncate">{fairName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Ended {endedDate} &middot; You collected{' '}
                        <span className="font-semibold text-indigo-600">{leadCount} lead{leadCount !== 1 ? 's' : ''}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Report auto-generated · No need to contact admin</p>
                </div>

                <div className="flex gap-2 shrink-0">
                    <Link
                        href={`/dashboard/university/fair-report/${fairId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
                    >
                        View Report <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href={`/dashboard/university/fair-report/${fairId}?export=true`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-2 transition-colors"
                    >
                        Export CSV
                    </Link>
                </div>
            </div>
        </div>
    )
}
