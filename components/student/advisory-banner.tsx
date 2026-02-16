'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface AdvisoryBannerProps {
    onOpen: () => void
}

export function AdvisoryBanner({ onOpen }: AdvisoryBannerProps) {
    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-yellow-100 rounded-full w-24 h-24 opacity-50 blur-xl"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide flex items-center gap-1">
                            <Sparkles size={10} />
                            IAES Guaranteed Pathway
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Clarity before commitment.
                    </h3>
                    <p className="text-sm text-gray-600 max-w-2xl">
                        Planning to study abroad is a major decision. Our certified IAES advisers can help you clarify options, evaluate readiness, and prepare smarter questions for university meetings.
                    </p>
                </div>

                <div className="shrink-0">
                    <Button
                        onClick={onOpen}
                        className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-200/50"
                    >
                        Book Guided Pathway Session
                    </Button>
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                        100% Free · No sales pressure
                    </p>
                </div>
            </div>
        </div>
    )
}
