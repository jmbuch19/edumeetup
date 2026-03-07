'use client'

import { Button } from '@/components/ui/button'
import { ImagePlus, Trash, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'

interface ImageUploadProps {
    disabled?: boolean
    onChange: (value: string, colors?: string[]) => void
    onRemove: (value: string) => void
    value: string[]
}

export default function ImageUpload({
    disabled,
    onChange,
    onRemove,
    value
}: ImageUploadProps) {
    const [isMounted, setIsMounted] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setIsMounted(true) }, [])

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('Image must be under 2 MB.')
            return
        }

        setError(null)
        setIsUploading(true)

        try {
            const form = new FormData()
            form.append('file', file)

            const res = await fetch('/api/upload/logo', { method: 'POST', body: form })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Upload failed')

            onChange(data.url)
        } catch (err: any) {
            setError(err.message || 'Upload failed. Please try again.')
        } finally {
            setIsUploading(false)
            // Reset so the same file can be re-selected if needed
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    if (!isMounted) return null

    return (
        <div>
            <div className="mb-4 flex items-center gap-4">
                {value.map((url) => (
                    <div key={url} className="relative w-[200px] h-[200px] rounded-md overflow-hidden border border-gray-200 group">
                        <div className="z-10 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                type="button"
                                onClick={() => onRemove(url)}
                                variant="destructive"
                                size="icon"
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                        <Image
                            fill
                            className="object-contain p-2"
                            alt="University logo"
                            src={url}
                        />
                    </div>
                ))}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled || isUploading}
            />

            <Button
                type="button"
                disabled={disabled || isUploading}
                variant="secondary"
                onClick={() => inputRef.current?.click()}
            >
                {isUploading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
                    : <><ImagePlus className="h-4 w-4 mr-2" /> Upload Logo</>
                }
            </Button>

            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG or SVG · max 2 MB</p>
        </div>
    )
}
