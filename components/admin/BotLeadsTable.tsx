'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { BotLead, LeadFilter } from '@/app/(admin)/admin/bot-leads/actions'

const TIER_CONFIG = {
    '🔥 Hot':  { bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500' },
    '🟡 Warm': { bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
    '🔵 Cold': { bg: 'bg-slate-50',  badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
} as const

type TierKey = keyof typeof TIER_CONFIG

interface Props {
    initialLeads: BotLead[]
    onFilterChange: (f: LeadFilter) => Promise<BotLead[]>
}

export function BotLeadsTable({ initialLeads, onFilterChange }: Props) {
    const [leads, setLeads] = useState<BotLead[]>(initialLeads)
    const [filter, setFilter] = useState<LeadFilter>('all')
    const [loading, setLoading] = useState(false)
    const [expanded, setExpanded] = useState<string | null>(null)

    async function applyFilter(f: LeadFilter) {
        if (f === filter) return
        setFilter(f)
        setLoading(true)
        try {
            const data = await onFilterChange(f)
            setLeads(data)
        } finally {
            setLoading(false)
        }
    }

    const FILTERS: { label: string; value: LeadFilter }[] = [
        { label: 'All', value: 'all' },
        { label: '🔥 Hot', value: 'hot' },
        { label: '🟡 Warm', value: 'warm' },
        { label: '🔵 Cold', value: 'cold' },
    ]

    return (
        <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => applyFilter(f.value)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            filter === f.value
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
                {loading && <span className="text-sm text-gray-400 self-center ml-2">Loading…</span>}
            </div>

            {/* Table */}
            {leads.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                    No bot conversations recorded yet. Once students start chatting, leads will appear here.
                </div>
            ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3 w-24">Score</th>
                                <th className="px-4 py-3">Visitor</th>
                                <th className="px-4 py-3">First Question</th>
                                <th className="px-4 py-3 w-32">Tools Used</th>
                                <th className="px-4 py-3 w-32">When</th>
                                <th className="px-4 py-3 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leads.map(lead => {
                                const tier = (TIER_CONFIG[lead.leadTier as TierKey] ?? TIER_CONFIG['🔵 Cold'])
                                const isExpanded = expanded === lead.id
                                return (
                                    <>
                                        <tr
                                            key={lead.id}
                                            className={`${tier.bg} hover:brightness-[0.97] cursor-pointer transition-all`}
                                            onClick={() => setExpanded(isExpanded ? null : lead.id)}
                                        >
                                            {/* Score */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tier.badge}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                                                    {lead.leadTier} · {lead.leadScore}/10
                                                </span>
                                            </td>
                                            {/* Visitor */}
                                            <td className="px-4 py-3">
                                                {lead.email ? (
                                                    <div>
                                                        <p className="font-medium text-gray-800">{lead.name || lead.email}</p>
                                                        <p className="text-gray-400 text-xs">{lead.email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">Anonymous</span>
                                                )}
                                            </td>
                                            {/* Question */}
                                            <td className="px-4 py-3 text-gray-700 max-w-[280px]">
                                                <p className="truncate">
                                                    {lead.question ?? <span className="text-gray-400 italic">—</span>}
                                                </p>
                                            </td>
                                            {/* Tools */}
                                            <td className="px-4 py-3">
                                                {lead.toolNames.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {[...new Set(lead.toolNames)].map(t => (
                                                            <span key={t} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 rounded px-1.5 py-0.5 font-mono">
                                                                {t === 'searchInternalUniversities' ? 'uni-search' : t === 'getUpcomingFairs' ? 'fairs' : t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">none</span>
                                                )}
                                            </td>
                                            {/* Time */}
                                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                                            </td>
                                            {/* Expand */}
                                            <td className="px-4 py-3 text-gray-300">
                                                <span className="text-lg leading-none">{isExpanded ? '▲' : '▼'}</span>
                                            </td>
                                        </tr>

                                        {/* Expanded detail row */}
                                        {isExpanded && (
                                            <tr key={`${lead.id}-expand`} className="bg-white">
                                                <td colSpan={6} className="px-6 py-4 border-t border-gray-100">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        {/* Signals */}
                                                        <div>
                                                            <p className="font-semibold text-gray-600 mb-2">Scoring signals</p>
                                                            {lead.leadSignals.length > 0 ? (
                                                                <ul className="space-y-1">
                                                                    {lead.leadSignals.map((s, i) => (
                                                                        <li key={i} className="flex items-center gap-2 text-gray-700">
                                                                            <span className="text-green-500">✓</span> {s}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : <p className="text-gray-400 italic">No signals fired</p>}
                                                        </div>
                                                        {/* Bot answer + timings */}
                                                        <div className="space-y-3">
                                                            {lead.answer && (
                                                                <div>
                                                                    <p className="font-semibold text-gray-600 mb-1">Bot reply (truncated)</p>
                                                                    <p className="text-gray-600 text-xs leading-relaxed line-clamp-4 bg-gray-50 rounded p-2 border">
                                                                        {lead.answer}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {lead.timings && Object.keys(lead.timings).length > 0 && (
                                                                <div>
                                                                    <p className="font-semibold text-gray-600 mb-1">Timings</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {Object.entries(lead.timings).map(([k, v]) => (
                                                                            <span key={k} className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                                                                                {k}: {v}ms
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {lead.streamEmpty && (
                                                                <p className="text-xs text-red-500 font-medium">⚠️ Stream was empty — bot may have failed silently</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
