'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, RefreshCw, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteStudentCV } from '@/app/student/profile/cv-actions'

interface CvUploadProps {
    studentId: string
    initialCvUrl?: string | null
    initialFileName?: string | null
    initialUploadedAt?: Date | string | null
    initialSizeBytes?: number | null
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function CvUpload({
    studentId,
    initialCvUrl,
    initialFileName,
    initialUploadedAt,
    initialSizeBytes,
}: CvUploadProps) {
    const [cvUrl, setCvUrl] = useState(initialCvUrl ?? null)
    const [fileName, setFileName] = useState(initialFileName ?? null)
    const [uploadedAt, setUploadedAt] = useState<string | null>(
        initialUploadedAt
            ? new Date(initialUploadedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : null
    )
    const [sizeBytes, setSizeBytes] = useState(initialSizeBytes ?? null)
    const [uploading, setUploading] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const viewUrl = `/api/cv/${studentId}`

    // ── Upload / Replace ─────────────────────────────────────────────────────
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = '' // reset so same file can be re-selected

        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are accepted')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(`File too large (${formatBytes(file.size)}). Max 5 MB.`)
            return
        }

        const wasReplace = !!cvUrl
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('cv', file)
            const res = await fetch('/api/cv/upload', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error ?? 'Upload failed')
                return
            }
            setCvUrl(viewUrl) // use proxy URL; actual R2 URL is server-side only
            setFileName(data.fileName)
            setSizeBytes(data.sizeBytes)
            setUploadedAt(
                new Date(data.uploadedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            )
            toast.success(wasReplace ? 'CV replaced successfully!' : 'CV uploaded successfully!')
        } catch {
            toast.error('Upload failed — please try again')
        } finally {
            setUploading(false)
        }
    }, [cvUrl, viewUrl])

    // ── Remove (confirmed) ───────────────────────────────────────────────────
    const handleRemoveConfirmed = async () => {
        setConfirmOpen(false)
        setRemoving(true)
        const result = await deleteStudentCV(studentId)
        if (result.ok) {
            setCvUrl(null)
            setFileName(null)
            setSizeBytes(null)
            setUploadedAt(null)
            toast.success('CV removed')
        } else {
            toast.error(result.error)
        }
        setRemoving(false)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    CV / Résumé
                </CardTitle>
                <CardDescription>
                    Upload your latest CV as a PDF (max 5 MB). This is optional but helps advisors and
                    universities evaluate your profile faster.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {cvUrl ? (
                    /* ── CV exists ─────────────────────────────────────────── */
                    <>
                        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <FileText className="h-8 w-8 text-green-600 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-green-900 truncate">{fileName}</p>
                                    <p className="text-xs text-green-700">
                                        {sizeBytes ? formatBytes(sizeBytes) : ''}
                                        {uploadedAt ? ` · Uploaded ${uploadedAt}` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                {/* View */}
                                <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        View
                                    </Button>
                                </a>

                                {/* Replace CV — teal outline */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={uploading || removing}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 border-teal-500 text-teal-700 hover:bg-teal-50"
                                >
                                    {uploading
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <RefreshCw className="h-3.5 w-3.5" />}
                                    Replace CV
                                </Button>

                                {/* Remove — red ghost */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={uploading || removing}
                                    onClick={() => setConfirmOpen(true)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    {removing
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        </div>

                        {/* Inline confirmation banner */}
                        {confirmOpen && (
                            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-red-800">Remove your CV?</p>
                                    <p className="text-xs text-red-600 mt-0.5">
                                        Universities won&apos;t be able to view it until you upload a new one.
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => setConfirmOpen(false)}
                                        className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        size="sm"
                                        disabled={removing}
                                        onClick={handleRemoveConfirmed}
                                        className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs"
                                    >
                                        {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* ── No CV — upload prompt ──────────────────────────────── */
                    <div
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        className={`
                            relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors
                            border-gray-300 hover:border-primary hover:bg-gray-50
                            ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
                        `}
                    >
                        {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-gray-600">Uploading…</p>
                            </div>
                        ) : (
                            <>
                                <Upload className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                                <p className="text-sm font-medium text-gray-700">
                                    Upload CV — drag &amp; drop or click
                                </p>
                                <p className="text-xs text-gray-400 mt-1">PDF only · Max 5 MB</p>
                            </>
                        )}
                    </div>
                )}

                {/* Hidden file input — shared by upload prompt and Replace button */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </CardContent>
        </Card>
    )
}
