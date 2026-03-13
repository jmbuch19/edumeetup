'use client'

import { useState, useEffect } from 'react'

export function ClientGreeting({ firstName }: { firstName: string }) {
    const [mounted, setMounted] = useState(false)
    const [greeting, setGreeting] = useState('')
    const [dateStr, setDateStr] = useState('')

    useEffect(() => {
        setMounted(true)
        const today = new Date()
        const hours = today.getHours()
        setGreeting(hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening')
        // Automatically uses standard browser locale
        setDateStr(today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))
    }, [])

    if (!mounted) {
        return (
            <div className="min-w-0">
                <p className="text-lg font-semibold truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                    Welcome, {firstName} 👋
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)', minHeight: '16px' }}></p>
            </div>
        )
    }

    return (
        <div className="min-w-0">
            <p className="text-lg font-semibold truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                {greeting}, {firstName} 👋
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {dateStr}
            </p>
        </div>
    )
}
