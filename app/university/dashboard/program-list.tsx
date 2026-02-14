
'use client'

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
            setPrograms(programs.filter(p => p.id !== id))
        } else {
            alert('Failed to delete program')
        }
    }

    return (
        <div className="space-y-4">
            {programs.map(prog => (
                <div key={prog.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-gray-900">{prog.programName}</h3>
                            <p className="text-sm text-gray-500">{prog.degreeLevel} • {prog.fieldOfStudy}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-green-600">${prog.tuitionFee.toLocaleString()}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(prog.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
