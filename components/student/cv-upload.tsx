'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CvUploadProps {
    studentId: string
    initialFileName?: string | null
    initialUploadedAt?: Date | string | null
    initialSizeBytes?: number | null
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function CvUpload({ studentId, initialFileName, initialUploadedAt, initialSizeBytes }: CvUploadProps) {
    const [fileName, setFileName] = useState(initialFileName ?? null)
    const [uploadedAt, setUploadedAt] = useState<string | null>(
        initialUploadedAt ? new Date(initialUploadedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null
    )
    const [sizeBytes, setSizeBytes] = useState(initialSizeBytes ?? null)
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const cvUrl = `/api/cv/${studentId}`

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are accepted')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(`File too large (${formatBytes(file.size)}). Max 5 MB.`)
            return
        }

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

            setFileName(data.fileName)
            setSizeBytes(data.sizeBytes)
            setUploadedAt(new Date(data.uploadedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))
            toast.success('CV uploaded successfully!')
        } catch {
            toast.error('Upload failed — please try again')
        } finally {
            setUploading(false)
        }
    }, [])

    const handleDelete = async () => {
        if (!confirm('Remove your uploaded CV?')) return
        setDeleting(true)
        try {
            const res = await fetch('/api/cv/upload', { method: 'DELETE' })
            if (res.ok) {
                setFileName(null)
                setUploadedAt(null)
                setSizeBytes(null)
                toast.success('CV removed')
            } else {
                toast.error('Could not remove CV')
            }
        } catch {
            toast.error('Could not remove CV')
        } finally {
            setDeleting(false)
        }
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
        disabled: uploading,
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    CV / Résumé
                </CardTitle>
                <CardDescription>
                    Upload your latest CV as a PDF (max 5 MB). This is optional but helps advisors and universities evaluate your profile faster.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current CV display */}
                {fileName ? (
                    <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-green-600 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-green-900">{fileName}</p>
                                <p className="text-xs text-green-700">
                                    {sizeBytes ? formatBytes(sizeBytes) : ''}
                                    {uploadedAt ? ` · Uploaded ${uploadedAt}` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <a
                                href={cvUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View
                                </Button>
                            </a>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3 text-sm text-gray-500">
                        <FileText className="h-5 w-5 text-gray-300" />
                        No CV uploaded yet
                    </div>
                )}

                {/* Drop zone */}
                <div
                    {...getRootProps()}
                    className={`
                        relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors
                        ${isDragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                        }
                        ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                >
                    <input {...getInputProps()} />
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-gray-600">Uploading…</p>
                        </div>
                    ) : (
                        <>
                            <Upload className={`mx-auto h-8 w-8 mb-2 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
                            <p className="text-sm font-medium text-gray-700">
                                {isDragActive ? 'Drop your PDF here' : fileName ? 'Replace CV — drag & drop or click' : 'Upload CV — drag & drop or click'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">PDF only · Max 5 MB</p>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
