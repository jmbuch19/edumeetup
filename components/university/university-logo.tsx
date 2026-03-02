
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Globe, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UniversityLogoProps {
    src?: string | null
    alt: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    isVerified?: boolean
    className?: string
}

const sizeMap = {
    sm: 32,
    md: 48,
    lg: 80,
    xl: 128
}

export function UniversityLogo({
    src,
    alt,
    size = 'md',
    isVerified = false,
    className
}: UniversityLogoProps) {
    const [error, setError] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)
    const pxSize = sizeMap[size]

    const sizeClass = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20',
        xl: 'w-32 h-32'
    }[size]

    const iconSize = size === 'sm' ? 8 : size === 'md' ? 10 : size === 'lg' ? 14 : 18

    return (
        <div className={cn("relative inline-block shrink-0", sizeClass, className)}>
            <div className={cn(
                "relative w-full h-full rounded-lg border bg-white overflow-hidden flex items-center justify-center",
                isVerified ? "ring-2 ring-indigo-400/40 ring-offset-1" : "",
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
                <div className="relative">
                    {/* Badge */}
                    <div
                        className="absolute -bottom-1 -right-1 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-default"
                        style={{ width: iconSize + 8, height: iconSize + 8 }}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <ShieldCheck size={iconSize} strokeWidth={2.5} />
                    </div>

                    {/* Tooltip */}
                    {showTooltip && (
                        <div className="absolute z-50 bottom-full right-0 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none leading-relaxed">
                            <p className="font-semibold text-indigo-300 mb-0.5">Official Profile</p>
                            <p className="text-gray-300">This profile is directly managed and updated by the official university team.</p>
                            <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900" />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
