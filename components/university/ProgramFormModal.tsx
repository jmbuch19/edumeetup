'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProgram, updateProgram } from '@/app/actions'
import { Loader2, ChevronDown, X, Plus } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Program {
    id: string
    programName: string
    degreeLevel: string
    fieldCategory: string
    durationMonths?: number | null
    tuitionFee?: number | null
    currency?: string | null
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
}

export interface ProgramFormModalProps {
    universityId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: 'add' | 'edit'
    program?: Program | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEGREE_LEVELS = ['Bachelors', 'Masters', 'MBA', 'PhD', 'Diploma', 'Certificate', 'Associate']
const FIELD_CATEGORIES = [
    'Computer Science', 'Engineering', 'Business', 'Data Science',
    'Health Sciences', 'Social Sciences', 'Arts & Humanities',
    'Law', 'Architecture', 'Others'
]
const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR']
const TEST_OPTIONS = ['NOT_REQUIRED', 'RECOMMENDED', 'REQUIRED'] as const
const TEST_LABELS: Record<string, string> = {
    NOT_REQUIRED: 'Not Required',
    RECOMMENDED: 'Recommended',
    REQUIRED: 'Required',
}

// ─── Section Accordion ────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <span className="font-semibold text-gray-800 text-sm">{title}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="p-5 space-y-4 bg-white">{children}</div>}
        </div>
    )
}

// ─── Test Requirement Row ─────────────────────────────────────────────────────

function TestRow({
    label, reqValue, onReqChange, minValue, onMinChange, maxValue, onMaxChange
}: {
    label: string
    reqValue: string
    onReqChange: (v: string) => void
    minValue: string
    onMinChange: (v: string) => void
    maxValue: string
    onMaxChange: (v: string) => void
}) {
    const showRange = reqValue === 'REQUIRED' || reqValue === 'RECOMMENDED'
    return (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
            <label className="text-sm font-medium text-gray-700 sm:col-span-1">{label}</label>
            <select
                value={reqValue}
                onChange={e => onReqChange(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:col-span-2"
            >
                {TEST_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{TEST_LABELS[opt]}</option>
                ))}
            </select>
            {showRange ? (
                <div className="flex gap-2 sm:col-span-2">
                    <Input
                        type="number"
                        placeholder="Min"
                        value={minValue}
                        onChange={e => onMinChange(e.target.value)}
                        className="flex-1"
                    />
                    <Input
                        type="number"
                        placeholder="Max"
                        value={maxValue}
                        onChange={e => onMaxChange(e.target.value)}
                        className="flex-1"
                    />
                </div>
            ) : (
                <div className="sm:col-span-2 text-xs text-gray-400 italic px-1">Score range not required</div>
            )}
        </div>
    )
}

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
    const [input, setInput] = useState('')

    const addTag = () => {
        const val = input.trim()
        if (val && !tags.includes(val)) {
            onChange([...tags, val])
        }
        setInput('')
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 min-h-9 p-2 border border-gray-300 rounded-md bg-white">
                {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {tag}
                        <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))}>
                            <X size={10} />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    placeholder="Type specialisation, press Enter"
                    className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                    <Plus size={14} />
                </Button>
            </div>
        </div>
    )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ProgramFormModal({ universityId, open, onOpenChange, mode, program }: ProgramFormModalProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // ── Section 1: Basic Info ──────────────────────────────────────────────────
    const [programName, setProgramName] = useState(program?.programName ?? '')
    const [degreeLevel, setDegreeLevel] = useState(program?.degreeLevel ?? 'Masters')
    const [fieldCategory, setFieldCategory] = useState(program?.fieldCategory ?? 'Computer Science')
    const [durationMonths, setDurationMonths] = useState(String(program?.durationMonths ?? '12'))
    const [tuitionFee, setTuitionFee] = useState(String(program?.tuitionFee ?? ''))
    const [currency, setCurrency] = useState(program?.currency ?? 'USD')
    const [intakes, setIntakes] = useState(program?.intakes?.join(', ') ?? '')
    const [stemDesignated, setStemDesignated] = useState(program?.stemDesignated ?? false)
    const [description, setDescription] = useState(program?.description ?? '')

    // ── Section 2: English ────────────────────────────────────────────────────
    const [englishTests, setEnglishTests] = useState(program?.englishTests?.join(', ') ?? '')
    const [minEnglishScore, setMinEnglishScore] = useState(String(program?.minEnglishScore ?? ''))

    // ── Section 3: Standardised Tests ─────────────────────────────────────────
    const [satRequired, setSatRequired] = useState(program?.satRequired ?? 'NOT_REQUIRED')
    const [satMin, setSatMin] = useState(String(program?.satMinScore ?? ''))
    const [satMax, setSatMax] = useState(String(program?.satMaxScore ?? ''))
    const [actRequired, setActRequired] = useState(program?.actRequired ?? 'NOT_REQUIRED')
    const [actMin, setActMin] = useState(String(program?.actMinScore ?? ''))
    const [actMax, setActMax] = useState(String(program?.actMaxScore ?? ''))
    const [greRequired, setGreRequired] = useState(program?.greRequired ?? 'NOT_REQUIRED')
    const [greMin, setGreMin] = useState(String(program?.greMinScore ?? ''))
    const [greMax, setGreMax] = useState(String(program?.greMaxScore ?? ''))
    const [gmatRequired, setGmatRequired] = useState(program?.gmatRequired ?? 'NOT_REQUIRED')
    const [gmatMin, setGmatMin] = useState(String(program?.gmatMinScore ?? ''))
    const [gmatMax, setGmatMax] = useState(String(program?.gmatMaxScore ?? ''))

    // ── Section 4: Application Requirements ───────────────────────────────────
    const [applicationFee, setApplicationFee] = useState(String(program?.applicationFee ?? ''))
    const [applicationFeeCur, setApplicationFeeCur] = useState(program?.applicationFeeCur ?? 'USD')
    const [deadlineType, setDeadlineType] = useState(program?.appDeadlineType ?? 'ROLLING')
    const [deadlineDate, setDeadlineDate] = useState(
        program?.appDeadlineDate
            ? new Date(program.appDeadlineDate).toISOString().split('T')[0]
            : ''
    )
    const [workExpYears, setWorkExpYears] = useState(String(program?.workExpYears ?? '0'))
    const [minGpa, setMinGpa] = useState(String(program?.minGpa ?? ''))
    const [minPercentage, setMinPercentage] = useState(String(program?.minPercentage ?? ''))

    // ── Section 5: Scholarships & Details ─────────────────────────────────────
    const [scholarshipAvail, setScholarshipAvail] = useState(program?.scholarshipAvail ?? 'NO')
    const [scholarshipDetails, setScholarshipDetails] = useState(program?.scholarshipDetails ?? '')
    const [coopAvailable, setCoopAvailable] = useState(program?.coopAvailable ?? false)
    const [specialisations, setSpecialisations] = useState<string[]>(program?.specialisations ?? [])

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!programName.trim()) { toast.error('Program name is required'); return }

        const fd = new FormData()
        fd.set('universityId', universityId)
        fd.set('programName', programName)
        fd.set('degreeLevel', degreeLevel)
        fd.set('fieldCategory', fieldCategory)
        fd.set('durationMonths', durationMonths)
        fd.set('tuitionFee', tuitionFee)
        fd.set('currency', currency)
        fd.set('intakes', intakes)
        fd.set('stemDesignated', String(stemDesignated))
        fd.set('description', description)
        fd.set('englishTests', englishTests)
        fd.set('minEnglishScore', minEnglishScore)
        fd.set('satRequired', satRequired); fd.set('satMinScore', satMin); fd.set('satMaxScore', satMax)
        fd.set('actRequired', actRequired); fd.set('actMinScore', actMin); fd.set('actMaxScore', actMax)
        fd.set('greRequired', greRequired); fd.set('greMinScore', greMin); fd.set('greMaxScore', greMax)
        fd.set('gmatRequired', gmatRequired); fd.set('gmatMinScore', gmatMin); fd.set('gmatMaxScore', gmatMax)
        fd.set('scholarshipAvail', scholarshipAvail)
        fd.set('scholarshipDetails', scholarshipDetails)
        fd.set('applicationFee', applicationFee)
        fd.set('applicationFeeCur', applicationFeeCur)
        fd.set('appDeadlineType', deadlineType)
        fd.set('appDeadlineDate', deadlineType === 'FIXED' ? deadlineDate : '')
        fd.set('workExpYears', workExpYears)
        fd.set('minGpa', minGpa)
        fd.set('minPercentage', minPercentage)
        fd.set('coopAvailable', String(coopAvailable))
        fd.set('specialisations', specialisations.join(','))

        startTransition(async () => {
            try {
                const result = mode === 'add'
                    ? await createProgram(fd)
                    : await updateProgram(program!.id, fd)

                if (result?.error) {
                    toast.error(typeof result.error === 'string' ? result.error : 'Validation failed')
                } else {
                    toast.success(mode === 'add' ? 'Program created!' : 'Program updated!')
                    onOpenChange(false)
                    router.refresh()
                }
            } catch {
                toast.error('Something went wrong. Please try again.')
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        {mode === 'add' ? 'Add New Program' : `Edit: ${program?.programName}`}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">

                    {/* ── Section 1: Basic Info ── */}
                    <Section title="Basic Info" defaultOpen>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
                            <Input value={programName} onChange={e => setProgramName(e.target.value)} placeholder="MSc Computer Science" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Degree Level *</label>
                                <select value={degreeLevel} onChange={e => setDegreeLevel(e.target.value)} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                                    {DEGREE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study *</label>
                                <select value={fieldCategory} onChange={e => setFieldCategory(e.target.value)} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                                    {FIELD_CATEGORIES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                                <Input type="number" value={durationMonths} onChange={e => setDurationMonths(e.target.value)} placeholder="24" min={1} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tuition Fee</label>
                                <Input type="number" value={tuitionFee} onChange={e => setTuitionFee(e.target.value)} placeholder="45000" min={0} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select value={currency} onChange={e => setCurrency(e.target.value)} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Intakes</label>
                            <Input value={intakes} onChange={e => setIntakes(e.target.value)} placeholder="Fall 2025, Spring 2026" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Brief program overview (max 500 chars)"
                                maxLength={500}
                                rows={3}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="stem" checked={stemDesignated} onChange={e => setStemDesignated(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <label htmlFor="stem" className="text-sm font-medium text-gray-700">STEM Designated Program</label>
                        </div>
                    </Section>

                    {/* ── Section 2: English Requirements ── */}
                    <Section title="English Requirements">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tests Accepted</label>
                                <Input value={englishTests} onChange={e => setEnglishTests(e.target.value)} placeholder="IELTS, TOEFL, PTE" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Score</label>
                                <Input type="number" value={minEnglishScore} onChange={e => setMinEnglishScore(e.target.value)} placeholder="6.5" step="0.5" min={0} />
                            </div>
                        </div>
                    </Section>

                    {/* ── Section 3: Standardised Tests ── */}
                    <Section title="Standardised Tests">
                        <p className="text-xs text-gray-500 -mt-1">Score range only appears when Required or Recommended is selected.</p>
                        <div className="space-y-4 pt-1">
                            <TestRow label="SAT" reqValue={satRequired} onReqChange={setSatRequired} minValue={satMin} onMinChange={setSatMin} maxValue={satMax} onMaxChange={setSatMax} />
                            <TestRow label="ACT" reqValue={actRequired} onReqChange={setActRequired} minValue={actMin} onMinChange={setActMin} maxValue={actMax} onMaxChange={setActMax} />
                            <TestRow label="GRE" reqValue={greRequired} onReqChange={setGreRequired} minValue={greMin} onMinChange={setGreMin} maxValue={greMax} onMaxChange={setGreMax} />
                            <TestRow label="GMAT" reqValue={gmatRequired} onReqChange={setGmatRequired} minValue={gmatMin} onMinChange={setGmatMin} maxValue={gmatMax} onMaxChange={setGmatMax} />
                        </div>
                    </Section>

                    {/* ── Section 4: Application Requirements ── */}
                    <Section title="Application Requirements">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Application Fee</label>
                                <Input type="number" value={applicationFee} onChange={e => setApplicationFee(e.target.value)} placeholder="90" min={0} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select value={applicationFeeCur} onChange={e => setApplicationFeeCur(e.target.value)} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                                    {['USD', 'GBP', 'EUR', 'CAD'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Application Deadline</label>
                            <div className="flex gap-3">
                                {['ROLLING', 'FIXED'].map(type => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" value={type} checked={deadlineType === type} onChange={() => setDeadlineType(type)} className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm text-gray-700">{type === 'ROLLING' ? 'Rolling' : 'Fixed Date'}</span>
                                    </label>
                                ))}
                            </div>
                            {deadlineType === 'FIXED' && (
                                <Input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="mt-3 max-w-xs" />
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Work Exp (years)</label>
                                <Input type="number" value={workExpYears} onChange={e => setWorkExpYears(e.target.value)} placeholder="0" min={0} max={20} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min GPA (/4.0)</label>
                                <Input type="number" value={minGpa} onChange={e => setMinGpa(e.target.value)} placeholder="3.0" step="0.1" min={0} max={4} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min % Score</label>
                                <Input type="number" value={minPercentage} onChange={e => setMinPercentage(e.target.value)} placeholder="65" min={0} max={100} />
                            </div>
                        </div>
                    </Section>

                    {/* ── Section 5: Scholarships & Program Details ── */}
                    <Section title="Scholarships & Program Details">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Scholarships for International Students</label>
                            <div className="flex gap-4">
                                {[['YES', 'Yes'], ['NO', 'No'], ['DEPENDS', 'Depends']].map(([val, label]) => (
                                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" value={val} checked={scholarshipAvail === val} onChange={() => setScholarshipAvail(val)} className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm text-gray-700">{label}</span>
                                    </label>
                                ))}
                            </div>
                            {(scholarshipAvail === 'YES' || scholarshipAvail === 'DEPENDS') && (
                                <textarea
                                    value={scholarshipDetails}
                                    onChange={e => setScholarshipDetails(e.target.value)}
                                    placeholder="e.g. Merit-based, up to $15,000/year"
                                    rows={2}
                                    className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="coop" checked={coopAvailable} onChange={e => setCoopAvailable(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <label htmlFor="coop" className="text-sm font-medium text-gray-700">Co-op / Internship Available</label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Specialisations</label>
                            <TagInput tags={specialisations} onChange={setSpecialisations} />
                        </div>
                    </Section>

                    {/* ── Submit ── */}
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending} className="flex-1">
                            {isPending ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : mode === 'add' ? 'Create Program' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
