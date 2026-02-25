'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function DownloadMyDataButton({ userName }: { userName: string | null }) {
    const [isLoading, setIsLoading] = useState(false)
    const [downloaded, setDownloaded] = useState(false)

    async function handleDownload() {
        setIsLoading(true)
        try {
            const res = await fetch('/api/my-data', { method: 'GET' })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to export data')
            }

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const date = new Date().toISOString().split('T')[0]
            const filename = `edumeetup-my-data-${date}.json`

            // iOS Safari doesn't honour programmatic anchor clicks for non-image blobs.
            // Detect iOS and fall back to opening the API URL directly (the server sets
            // Content-Disposition: attachment so iOS Downloads handles it correctly).
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            if (isIOS) {
                window.open('/api/my-data', '_blank')
            } else {
                const link = document.createElement('a')
                link.href = url
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            }

            setDownloaded(true)
            toast.success('Your data export is downloading.')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to export data. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <h3 className="font-semibold text-slate-800 mb-1">Download Your Data</h3>
                <p className="text-sm text-slate-500">
                    Download a complete copy of all personal data we hold about you, formatted as a JSON file.
                    This includes your profile, activity history, consent records, and more.
                </p>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-sm text-sky-800 space-y-1">
                <p className="font-medium">What's included in your export:</p>
                <ul className="list-disc pl-4 text-sky-700 space-y-0.5 mt-1">
                    <li>Account info and profile data</li>
                    <li>University interests and meeting history</li>
                    <li>Support tickets and notifications</li>
                    <li>Consent preferences and change history</li>
                    <li>All audit log entries related to your account</li>
                </ul>
            </div>

            <Button
                onClick={handleDownload}
                disabled={isLoading}
                className="flex items-center gap-2"
                variant={downloaded ? 'outline' : 'default'}
            >
                {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Preparing export…</>
                ) : downloaded ? (
                    <><CheckCircle className="h-4 w-4 text-green-600" /> Downloaded</>
                ) : (
                    <><Download className="h-4 w-4" /> Download My Data</>
                )}
            </Button>

            <p className="text-xs text-slate-400">
                File will be named <code>edumeetup-my-data-{new Date().toISOString().split('T')[0]}.json</code>.
                This request is logged for security purposes.
            </p>
        </div>
    )
}
