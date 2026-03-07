'use client'

import { Button } from '@/components/ui/button'
import { exportMeetingsToCSV } from './actions'
import { Download } from 'lucide-react'
import { useState } from 'react'

export default function ExportButton() {
    const [isLoading, setIsLoading] = useState(false)

    async function handleExport() {
        setIsLoading(true)
        const res = await exportMeetingsToCSV() // Add filters later if UI supports it
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
            return
        }

        if (res.csv) {
            const blob = new Blob([res.csv], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `meetings-export-${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading} className="gap-2">
            <Download className="h-4 w-4" />
            {isLoading ? 'Exporting...' : 'Export CSV'}
        </Button>
    )
}
