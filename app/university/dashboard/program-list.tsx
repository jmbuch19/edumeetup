
'use client'
import { toast } from 'sonner'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Users, Pencil } from 'lucide-react'
import { deleteProgram } from '@/app/actions'
import { InterestPanel } from '@/components/university/interest-panel'
import { ProgramImportModal } from '@/components/university/program-import-modal'
import { ProgramFormModal } from '@/components/university/ProgramFormModal'
import { Upload } from 'lucide-react'

interface Program {
    id: string
    programName: string
    degreeLevel: string
    fieldCategory: string
    tuitionFee?: number | null
    currency?: string | null
    durationMonths?: number | null
    intakes?: string[]
    stemDesignated?: boolean
    description?: string | null
    englishTests?: string[]
    minEnglishScore?: number | null
    satRequired?: string | null
    satMinScore?: number | null
    satMaxScore?: number | null
    actRequired?: string | null
    actMinScore?: number | null
    actMaxScore?: number | null
    greRequired?: string | null
    greMinScore?: number | null
    greMaxScore?: number | null
    gmatRequired?: string | null
    gmatMinScore?: number | null
    gmatMaxScore?: number | null
    scholarshipAvail?: string | null
    scholarshipDetails?: string | null
    applicationFee?: number | null
    applicationFeeCur?: string | null
    appDeadlineType?: string | null
    appDeadlineDate?: Date | string | null
    workExpYears?: number | null
    minGpa?: number | null
    minPercentage?: number | null
    coopAvailable?: boolean
    specialisations?: string[]
    _count?: {
        interests: number
    }
}

export default function ProgramList({ programs: initialPrograms, universityId }: { programs: Program[], universityId: string }) {
    const [programs, setPrograms] = useState(initialPrograms)
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editProgram, setEditProgram] = useState<Program | null>(null)

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

    const selectedProgram = programs.find(p => p.id === selectedProgramId)

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Programs</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="gap-2">
                        <Upload className="h-4 w-4" />
                        Import CSV
                    </Button>
                    <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2">
                        + Add Program
                    </Button>
                </div>
            </div>

            {programs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Upload className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">No programs yet</h3>
                    <p className="text-xs text-gray-500 mt-1 mb-4 max-w-xs mx-auto">
                        Add programs manually or import your entire catalog in seconds.
                    </p>
                    <Button onClick={() => setShowImportModal(true)} variant="secondary" className="bg-white hover:bg-gray-50 border shadow-sm">
                        Smart Import Programs
                    </Button>
                </div>
            ) : (
                programs.map(prog => (
                    <div key={prog.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">{prog.programName}</h3>
                                <p className="text-sm text-gray-500">{prog.degreeLevel} • {prog.fieldCategory}</p>
                                {prog.specialisations && prog.specialisations.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {prog.specialisations.slice(0, 3).map(s => (
                                            <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                                        ))}
                                        {prog.specialisations.length > 3 && (
                                            <span className="text-xs text-gray-400">+{prog.specialisations.length - 3} more</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 sm:flex-none gap-2 text-blue-600 border-blue-100 hover:bg-blue-50"
                                    onClick={() => setSelectedProgramId(prog.id)}
                                >
                                    <Users className="h-4 w-4" />
                                    {prog._count?.interests || 0}
                                    <span className="sm:hidden">Interested</span>
                                </Button>

                                <span className="text-sm font-medium text-green-600 font-mono">
                                    {prog.currency || '$'}{prog.tuitionFee?.toLocaleString() ?? 0}
                                </span>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditProgram(prog)}
                                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-8 w-8 p-0"
                                    title="Edit program"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(prog.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                    title="Delete program"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}

            <InterestPanel
                programId={selectedProgramId}
                open={!!selectedProgramId}
                onOpenChange={(open) => !open && setSelectedProgramId(null)}
                programName={selectedProgram?.programName || ''}
            />

            <ProgramImportModal
                universityId={universityId}
                open={showImportModal}
                onOpenChange={setShowImportModal}
            />

            {/* Edit modal — opens when a program's pencil icon is clicked */}
            <ProgramFormModal
                universityId={universityId}
                open={!!editProgram}
                onOpenChange={(open) => !open && setEditProgram(null)}
                mode="edit"
                program={editProgram}
            />

            {/* Add modal — opens when '+ Add Program' button is clicked */}
            <ProgramFormModal
                universityId={universityId}
                open={showAddModal}
                onOpenChange={setShowAddModal}
                mode="add"
            />
        </div>
    )
}
