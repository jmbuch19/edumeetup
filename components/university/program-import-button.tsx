'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UploadCloud } from 'lucide-react'
import { ProgramImportModal } from './program-import-modal'

export function ProgramImportButton({ universityId }: { universityId: string }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-blue-900">Bulk Import Programs</h3>
                    <p className="text-xs text-blue-600 mt-1">Don&apos;t type manually! Upload your course catalog CSV.</p>
                </div>
                <Button
                    onClick={() => setOpen(true)}
                    variant="outline"
                    className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Import CSV
                </Button>
            </div>

            <ProgramImportModal
                universityId={universityId}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    )
}
