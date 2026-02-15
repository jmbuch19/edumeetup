
'use client'
import { toast } from 'sonner'

import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteProgram } from '@/app/actions'

interface Program {
    id: string
    programName: string
    degreeLevel: string
    fieldOfStudy: string
    tuitionFee: number
}

export default function ProgramList({ programs: initialPrograms }: { programs: Program[] }) {
    const [programs, setPrograms] = useState(initialPrograms)

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this program?')) return

        const result = await deleteProgram(id)
        if (result.success) {
            toast.success('Program deleted successfully')
            setPrograms(programs.filter(p => p.id !== id))
        } else {
            toast.error('Failed to delete program')
        }
    }

    return (
        <div className="space-y-4">
            {programs.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm">No programs yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Add your first program above to start matching with students.</p>
                </div>
            ) : (
                programs.map(prog => (
                    <div key={prog.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-gray-900">{prog.programName}</h3>
                                <p className="text-sm text-gray-500">{prog.degreeLevel} • {prog.fieldOfStudy}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-green-600 font-mono">${prog.tuitionFee.toLocaleString()}</span>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(prog.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}
