
'use client'

import { CldUploadWidget } from 'next-cloudinary'
import { Button } from '@/components/ui/button'
import { ImagePlus, Trash, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useState, useEffect } from 'react'

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

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const onUpload = useCallback((result: any) => {
        // Result structure: { info: { secure_url: string, colors: [[hex, coverage], ...] } }
        const url = result.info.secure_url
        // Extract basic color if available (Cloudinary usually returns simplified color info in 'colors' field)
        // Or user can use the 'e_theme' transformation later.
        // For MVP, if colors array exists, we take the top one.
        const extractedColors = result.info.colors?.map((c: any) => c[0])

        onChange(url, extractedColors)
    }, [onChange])

    if (!isMounted) {
        return null;
    }

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
                            alt="Image"
                            src={url}
                        />
                    </div>
                ))}
            </div>
            <CldUploadWidget
                onSuccess={onUpload}
                uploadPreset="edumeetup_unsigned"
                options={{
                    maxFiles: 1,
                    sources: ['local', 'url'],
                    clientAllowedFormats: ['image'],
                    multiple: false
                }}
            >
                {({ open }) => {
                    return (
                        <div className="space-y-2">
                            <Button
                                type="button"
                                disabled={disabled}
                                variant="secondary"
                                onClick={() => open()}
                            >
                                <ImagePlus className="h-4 w-4 mr-2" />
                                Upload Logo
                            </Button>
                            <p className="text-[10px] text-muted-foreground">
                                Requires Cloudinary Upload Preset: <b>edumeetup_unsigned</b>
                            </p>
                        </div>
                    )
                }}
            </CldUploadWidget>
        </div>
    )
}
