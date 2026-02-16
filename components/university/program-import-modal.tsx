'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react'
import { bulkCreatePrograms, ProgramImportData } from '@/app/actions/bulk-program-actions'
import { useRouter } from 'next/navigation'

interface ProgramImportModalProps {
    universityId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProgramImportModal({ universityId, open, onOpenChange }: ProgramImportModalProps) {
    const router = useRouter()
    const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload')
    const [parsedData, setParsedData] = useState<ProgramImportData[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) {
                    setError("Error parsing CSV. Please check the format.")
                    return
                }

                // Auto-map columns logic (Smart Import)
                // We assume the user's CSV header names might vary, so we map them to our internal keys
                // Currently implementing a simple mapping for MVP
                const mappedData: ProgramImportData[] = results.data.map((row: any) => ({
                    programName: row['Program Name'] || row['Program'] || row['Name'] || row['Course'] || 'Untitled Program',
                    degreeLevel: row['Degree Level'] || row['Degree'] || row['Level'] || "Master's",
                    fieldCategory: row['Field'] || row['Category'] || row['Department'] || "Others",
                    tuitionFee: parseFloat(row['Tuition'] || row['Fee'] || row['Cost'] || '0'),
                    durationMonths: parseInt(row['Duration'] || row['Months'] || '12'),
                    intakes: row['Intake'] || row['Intakes'] || "Fall 2025"
                }))

                setParsedData(mappedData)
                setStep('preview')
                setError(null)
            },
            error: (err) => {
                setError("Failed to read file: " + err.message)
            }
        })
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv', '.xls', '.xlsx']
        },
        multiple: false
    })

    const handleImport = async () => {
        setIsUploading(true)
        try {
            const result = await bulkCreatePrograms(universityId, parsedData)
            if (result.success) {
                setStep('success')
                router.refresh()
            } else {
                setError(result.error || "Import failed")
            }
        } catch (e) {
            setError("An unexpected error occurred.")
        } finally {
            setIsUploading(false)
        }
    }

    const reset = () => {
        setStep('upload')
        setParsedData([])
        setError(null)
        onOpenChange(false)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Import Programs</h2>
                        <p className="text-sm text-gray-500 mt-1">Bulk upload your course catalog in seconds.</p>
                    </div>
                    <button onClick={reset} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">
                    {step === 'upload' && (
                        <div {...getRootProps()} className={`
                            border-3 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group
                            ${isDragActive ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'}
                        `}>
                            <input {...getInputProps()} />
                            <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                <UploadCloud size={40} />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {isDragActive ? "Drop it here!" : "Drag & drop your file here"}
                            </h3>
                            <p className="text-gray-500 max-w-sm">
                                Support for CSV, Excel. We&apos;ll auto-magically map your columns.
                            </p>
                            <div className="mt-8">
                                <Button variant="outline" className="text-gray-600">Select File</Button>
                            </div>

                            <div className="mt-8 text-xs text-gray-400 flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100 text-yellow-700">
                                💡 Tip: You can upload your existing internal spreadsheet direct!
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg border border-green-100 text-green-800">
                                <CheckCircle size={20} />
                                <span className="font-medium">Found {parsedData.length} programs! Please review the auto-mapping.</span>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                        <tr>
                                            <th className="px-4 py-3">Program Name</th>
                                            <th className="px-4 py-3">Degree</th>
                                            <th className="px-4 py-3">Field</th>
                                            <th className="px-4 py-3">Tuition</th>
                                            <th className="px-4 py-3">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedData.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{row.programName}</td>
                                                <td className="px-4 py-3">{row.degreeLevel}</td>
                                                <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{row.fieldCategory}</span></td>
                                                <td className="px-4 py-3">${row.tuitionFee?.toLocaleString()}</td>
                                                <td className="px-4 py-3">{row.durationMonths}mo</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 5 && (
                                    <div className="bg-gray-50 px-4 py-2 text-xs text-center text-gray-500 border-t">
                                        ...and {parsedData.length - 5} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                                <CheckCircle size={40} />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">You&apos;re Live!</h2>
                            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                                {parsedData.length} programs have been successfully imported and are now visible to thousands of students.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    {step === 'upload' && (
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
                            <Button onClick={handleImport} disabled={isUploading} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                {isUploading ? 'Importing...' : `Import ${parsedData.length} Programs`}
                            </Button>
                        </>
                    )}
                    {step === 'success' && (
                        <Button onClick={reset} className="w-full bg-green-600 hover:bg-green-700 text-white">
                            View My Dashboard
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
