'use client'

import { useEffect, useRef } from 'react'
import { syncUserTimezone } from '@/app/actions/timezone'

export function TimezoneSyncer({ sessionTimezone }: { sessionTimezone?: string }) {
    const hasSynced = useRef(false)

    useEffect(() => {
        if (hasSynced.current) return
        hasSynced.current = true

        try {
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            
            if (detectedTimezone && detectedTimezone !== sessionTimezone) {
                syncUserTimezone(detectedTimezone).catch(console.error)
            }
        } catch (e) {
            console.error("Timezone detection failed", e)
        }
    }, [sessionTimezone])

    return null
}
