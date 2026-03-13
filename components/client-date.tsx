'use client'

import { useState, useEffect } from 'react'

export function ClientDate({ pendingCount = 0 }: { pendingCount?: number }) {
    const [mounted, setMounted] = useState(false)
    const [dateStr, setDateStr] = useState('')

    useEffect(() => {
        setMounted(true)
        const today = new Date()
        setDateStr(today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }, [])

    if (!mounted) {
        return (
            <span style={{ color: 'var(--text-muted)' }}>
                Loading date...{pendingCount > 0 ? ` · ${pendingCount} new interests` : ''}
            </span>
        )
    }

    return (
        <span style={{ color: 'var(--text-muted)' }}>
            {dateStr}{pendingCount > 0 ? ` · ${pendingCount} new interests` : ''}
        </span>
    )
}
