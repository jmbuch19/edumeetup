import { getBotMisses, getBotMissStats } from './actions'
import { BotMissesTable } from './BotMissesTable'
import { BotOff } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BotMissesPage() {
    const [misses, stats] = await Promise.all([
        getBotMisses(),
        getBotMissStats(),
    ])

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 px-4 space-y-6">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <BotOff className="h-6 w-6 text-muted-foreground" />
                    <h1 className="text-2xl font-bold tracking-tight">Bot Misses</h1>
                </div>
                <p className="text-muted-foreground text-sm">
                    Questions the Admissions Concierge couldn&apos;t answer. Use these to improve the bot&apos;s system prompt or tool coverage.
                </p>
            </div>

            <BotMissesTable initialMisses={misses} stats={stats} />
        </div>
    )
}
