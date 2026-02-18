
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UniversityLogoProps {
    src?: string | null
    alt: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    isVerified?: boolean
    className?: string
}

const sizeMap = {
    sm: 32,  // 8
    md: 48,  // 12
    lg: 80,  // 20
    xl: 128  // 32
}

export function UniversityLogo({
    src,
    alt,
    size = 'md',
    isVerified = false,
    className
}: UniversityLogoProps) {
    const [error, setError] = useState(false)
    const pxSize = sizeMap[size]

    // Determine container size class
    const sizeClass = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20',
        xl: 'w-32 h-32'
    }[size]

    return (
        <div className={cn("relative inline-block shrink-0", sizeClass, className)}>
            <div className={cn(
                "relative w-full h-full rounded-lg border bg-white overflow-hidden flex items-center justify-center",
                "shadow-sm"
            )}>
                {src && !error ? (
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        className="object-contain p-1"
                        onError={() => setError(true)}
                        sizes={`${pxSize}px`}
                    />
                ) : (
                    <Globe className="text-muted-foreground opacity-50" size={pxSize / 2} />
                )}
            </div>

            {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 border-2 border-white shadow-sm flex items-center justify-center">
                    <Check size={size === 'sm' ? 8 : size === 'md' ? 10 : 14} strokeWidth={3} />
                </div>
            )}
        </div>
    )
}
