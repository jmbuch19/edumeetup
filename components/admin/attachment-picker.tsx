'use client'

import { useRef, useState, useCallback } from 'react'
import { Paperclip, X, Upload, FileText, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.docx'
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

function fileIcon(type: string) {
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
    return <FileText className="h-4 w-4 text-red-500" />
}

function formatBytes(n: number) {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
    /** Called when a valid file is selected. Null = cleared. */
    onChange: (file: File | null) => void
    className?: string
}

export function AttachmentPicker({ onChange, className }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const validate = (f: File): string | null => {
        if (!ACCEPTED_TYPES.includes(f.type)) {
            return `Unsupported type. Use PDF, PNG, JPG, or DOCX.`
        }
        if (f.size > MAX_BYTES) {
            return `File too large (${formatBytes(f.size)}). Max 5 MB.`
        }
        return null
    }

    const select = useCallback((f: File) => {
        const err = validate(f)
        if (err) { setError(err); return }
        setError(null)
        setFile(f)
        onChange(f)
    }, [onChange])

    const clear = () => {
        setFile(null)
        setError(null)
        onChange(null)
        if (inputRef.current) inputRef.current.value = ''
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) select(dropped)
    }

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
    const onDragLeave = () => setIsDragging(false)

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0]
        if (picked) select(picked)
    }

    return (
        <div className={cn('space-y-2', className)}>
            <div
                role="button"
                tabIndex={0}
                aria-label="Upload attachment"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => !file && inputRef.current?.click()}
                onKeyDown={e => e.key === 'Enter' && !file && inputRef.current?.click()}
                className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-sm transition-colors',
                    isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30',
                    file ? 'cursor-default' : 'cursor-pointer',
                )}
            >
                {file ? (
                    // File selected — show badge
                    <div className="flex items-center gap-2 w-full">
                        {fileIcon(file.type)}
                        <span className="flex-1 truncate font-medium text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); clear() }}
                            aria-label="Remove attachment"
                            className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    // Drop zone
                    <>
                        <Upload className="h-6 w-6 text-muted-foreground/60" />
                        <span className="text-muted-foreground text-center">
                            Drag & drop or{' '}
                            <span className="text-primary font-medium underline underline-offset-2">browse files</span>
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                            PDF, PNG, JPG, DOCX — max 5 MB
                        </span>
                        <div className="flex gap-2 mt-1">
                            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                                <Paperclip className="h-3.5 w-3.5 mr-1" />
                                From computer
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}

            {/* Hidden file input — accept= covers local + mounted drives (incl. Google Drive) */}
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={onInputChange}
                aria-hidden
            />
        </div>
    )
}
