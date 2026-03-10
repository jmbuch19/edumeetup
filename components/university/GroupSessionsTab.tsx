'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import GroupSessionManager from '@/components/university/GroupSessionManager'
import { type GroupSessionWithStats } from '@/app/university/actions/group-sessions'

// Lazy-load the creator so the form only mounts when needed
const GroupSessionCreator = dynamic(() => import('@/components/university/GroupSessionCreator'), { ssr: false })

export function GroupSessionsTab({
    sessions,
    programs,
}: {
    sessions: GroupSessionWithStats[]
    programs: { id: string; programName: string; fieldCategory: string }[]
}) {
    const [showCreator, setShowCreator] = useState(false)

    return (
        <div className="space-y-6">
            {showCreator && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">New Group Session</h3>
                    <GroupSessionCreator
                        programs={programs}
                        onClose={() => setShowCreator(false)}
                    />
                </div>
            )}

            <GroupSessionManager
                sessions={sessions}
                onCreateNew={() => setShowCreator(true)}
            />
        </div>
    )
}
