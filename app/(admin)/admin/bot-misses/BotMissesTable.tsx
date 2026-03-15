'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Trash2, RefreshCcw } from 'lucide-react'
import { dismissBotMiss, clearAllBotMisses, getBotMisses } from './actions'
import type { BotMiss } from './actions'

interface Props {
    initialMisses: BotMiss[]
    stats: { total: number; last24h: number; last7d: number }
}

export function BotMissesTable({ initialMisses, stats }: Props) {
    const [misses, setMisses] = useState<BotMiss[]>(initialMisses)
    const [isPending, startTransition] = useTransition()
    const [clearing, setClearing] = useState(false)

    function handleDismiss(id: string) {
        startTransition(async () => {
            await dismissBotMiss(id)
            setMisses(prev => prev.filter(m => m.id !== id))
        })
    }

    async function handleClearAll() {
        if (!confirm(`Clear all ${misses.length} unanswered questions? This cannot be undone.`)) return
        setClearing(true)
        try {
            await clearAllBotMisses()
            setMisses([])
        } finally {
            setClearing(false)
        }
    }

    async function handleRefresh() {
        startTransition(async () => {
            const fresh = await getBotMisses()
            setMisses(fresh as BotMiss[])
        })
    }

    return (
        <div className="space-y-6">
            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total misses',  value: stats.total },
                    { label: 'Last 24 hours', value: stats.last24h },
                    { label: 'Last 7 days',   value: stats.last7d },
                ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border bg-card p-4 text-center shadow-sm">
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {misses.length > 0
                        ? `${misses.length} unanswered question${misses.length !== 1 ? 's' : ''} — newest first`
                        : 'No unanswered questions recorded yet.'}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                        <RefreshCcw className="h-3 w-3" />
                        Refresh
                    </button>
                    {misses.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            disabled={clearing}
                            className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="h-3 w-3" />
                            {clearing ? 'Clearing…' : 'Clear all'}
                        </button>
                    )}
                </div>
            </div>

            {/* Questions list */}
            {misses.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground text-sm">
                    No unanswered questions. The bot is handling everything — or misses haven&apos;t been recorded yet.
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden divide-y bg-white shadow-sm">
                    {misses.map((miss, idx) => (
                        <div key={miss.id} className="flex items-start gap-4 px-4 py-3 hover:bg-slate-50/60 transition-colors group">
                            {/* Index */}
                            <span className="text-xs text-muted-foreground pt-0.5 w-6 shrink-0 text-right">
                                {idx + 1}
                            </span>
                            {/* Question */}
                            <p className="flex-1 text-sm text-gray-800 leading-relaxed">{miss.question}</p>
                            {/* Meta + dismiss */}
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(new Date(miss.createdAt), { addSuffix: true })}
                                </span>
                                <button
                                    onClick={() => handleDismiss(miss.id)}
                                    disabled={isPending}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all disabled:opacity-30"
                                    title="Dismiss"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {misses.length === 100 && (
                <p className="text-xs text-center text-muted-foreground">Showing latest 100 questions</p>
            )}
        </div>
    )
}
