'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, FileText, Image, Trash2, ExternalLink, Loader2, Plus, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface UniDoc {
    id: string
    displayName: string
    category: string
    fileName: string
    mimeType: string
    sizeBytes: number
    uploadedAt: string
}

interface UniDocManagerProps {
    initialDocs: UniDoc[]
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const CATEGORY_LABELS: Record<string, string> = {
    BROCHURE: 'University Brochure',
    PROGRAM_INFO: 'Program Information',
    LEAFLET: 'Leaflet / Flyer',
    OTHER: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
    BROCHURE: 'bg-blue-100 text-blue-700',
    PROGRAM_INFO: 'bg-emerald-100 text-emerald-700',
    LEAFLET: 'bg-amber-100 text-amber-700',
    OTHER: 'bg-gray-100 text-gray-700',
}

export function UniDocManager({ initialDocs }: UniDocManagerProps) {
    const [docs, setDocs] = useState<UniDoc[]>(initialDocs)
    const [uploading, setUploading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [displayName, setDisplayName] = useState('')
    const [category, setCategory] = useState('BROCHURE')
    const [pendingFile, setPendingFile] = useState<File | null>(null)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return
        if (file.size > 10 * 1024 * 1024) {
            toast.error(`File too large (${formatBytes(file.size)}). Max 10 MB.`)
            return
        }
        setPendingFile(file)
        // Pre-fill the display name with file name (without extension)
        if (!displayName) {
            setDisplayName(file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '))
        }
    }, [displayName])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
        },
        maxFiles: 1,
        disabled: uploading,
    })

    const handleUpload = async () => {
        if (!pendingFile) { toast.error('Please select a file'); return }
        if (!displayName.trim()) { toast.error('Please enter a document name'); return }

        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', pendingFile)
            fd.append('displayName', displayName.trim())
            fd.append('category', category)

            const res = await fetch('/api/uni-docs/upload', { method: 'POST', body: fd })
            const data = await res.json()

            if (!res.ok) { toast.error(data.error ?? 'Upload failed'); return }

            setDocs(prev => [{ ...data, uploadedAt: data.uploadedAt }, ...prev])
            setPendingFile(null)
            setDisplayName('')
            toast.success('Document uploaded!')
        } catch {
            toast.error('Upload failed — try again')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (docId: string, name: string) => {
        if (!confirm(`Remove "${name}"?`)) return
        setDeletingId(docId)
        try {
            const res = await fetch(`/api/uni-docs/${docId}`, { method: 'DELETE' })
            if (res.ok) {
                setDocs(prev => prev.filter(d => d.id !== docId))
                toast.success('Document removed')
            } else {
                toast.error('Could not remove document')
            }
        } catch {
            toast.error('Could not remove document')
        } finally {
            setDeletingId(null)
        }
    }

    const getFileIcon = (mimeType: string) =>
        mimeType.startsWith('image/')
            ? <Image className="h-5 w-5 text-blue-500 flex-shrink-0" />
            : <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />

    return (
        <div className="space-y-6">
            {/* Upload form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        Add Document
                    </CardTitle>
                    <CardDescription>
                        Upload PDFs, brochures, or leaflets for students to download. Max 10 MB per file. Up to 20 documents total.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="docName">Document Name *</Label>
                            <Input
                                id="docName"
                                placeholder="e.g. MSc CS Brochure 2025"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Category *</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Drop zone / selected file */}
                    {pendingFile ? (
                        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                            <div className="flex items-center gap-3">
                                {getFileIcon(pendingFile.type)}
                                <div>
                                    <p className="text-sm font-medium">{pendingFile.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatBytes(pendingFile.size)}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setPendingFile(null)} className="text-muted-foreground">
                                ✕
                            </Button>
                        </div>
                    ) : (
                        <div
                            {...getRootProps()}
                            className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors
                                ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
                                ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <input {...getInputProps()} />
                            <Upload className={`mx-auto h-7 w-7 mb-2 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
                            <p className="text-sm font-medium text-gray-700">
                                {isDragActive ? 'Drop your file here' : 'Drag & drop or click to browse'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP · Max 10 MB</p>
                        </div>
                    )}

                    <Button
                        onClick={handleUpload}
                        disabled={!pendingFile || !displayName.trim() || uploading}
                        className="w-full sm:w-auto"
                    >
                        {uploading
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
                            : <><Upload className="mr-2 h-4 w-4" />Upload Document</>
                        }
                    </Button>
                </CardContent>
            </Card>

            {/* Document list */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Uploaded Documents
                        <span className="text-sm font-normal text-muted-foreground">({docs.length} / 20)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {docs.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            No documents uploaded yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {docs.map(doc => (
                                <div key={doc.id} className="flex items-center gap-4 py-3">
                                    {getFileIcon(doc.mimeType)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{doc.displayName}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.OTHER}`}>
                                                {CATEGORY_LABELS[doc.category] ?? doc.category}
                                            </span>
                                            <span>{formatBytes(doc.sizeBytes)}</span>
                                            <span>·</span>
                                            <span>{new Date(doc.uploadedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <a href={`/api/uni-docs/${doc.id}`} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                View
                                            </Button>
                                        </a>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(doc.id, doc.displayName)}
                                            disabled={deletingId === doc.id}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            {deletingId === doc.id
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Trash2 className="h-3.5 w-3.5" />
                                            }
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
