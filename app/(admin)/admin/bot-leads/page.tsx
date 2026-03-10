import { requireRole } from '@/lib/auth'
import { getBotLeads, getBotLeadStats, getBotLeads as refetch } from './actions'
import { BotLeadsTable } from '@/components/admin/BotLeadsTable'
import type { LeadFilter } from './actions'

export const metadata = { title: 'Bot Leads — EdUmeetup Admin' }

// Allow up to 60s for this page (reads many logs)
export const maxDuration = 60

export default async function BotLeadsPage() {
    await requireRole('ADMIN')

    const [leads, stats] = await Promise.all([
        getBotLeads('all', 50),
        getBotLeadStats(),
    ])

    // Server action wrapper exposed to the client table for filter changes
    async function filterLeads(f: LeadFilter) {
        'use server'
        return getBotLeads(f, 50)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Bot Leads</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Conversations scored by intent signal. Hot leads are most likely to register or book a meeting.
                </p>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Conversations (24h)" value={stats.total24h} />
                <StatCard label="🔥 Hot leads (24h)" value={stats.hot24h} highlight />
                <StatCard label="🟡 Warm leads (24h)" value={stats.warm24h} />
                <StatCard label="Conversations (7d)" value={stats.total7d} />
            </div>

            {/* Table */}
            <BotLeadsTable initialLeads={leads} onFilterChange={filterLeads} />
        </div>
    )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div className={`rounded-xl border p-4 ${highlight ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
        </div>
    )
}
