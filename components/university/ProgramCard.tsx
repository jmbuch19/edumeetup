'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Clock, DollarSign, Calendar, GraduationCap,
    Briefcase, Award, FlaskConical, CheckCircle, XCircle
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Program {
    id: string
    programName: string
    degreeLevel: string
    fieldCategory: string
    durationMonths?: number | null
    tuitionFee?: number | null
    currency?: string | null
    intakes: string[]
    stemDesignated: boolean
    description?: string | null
    englishTests: string[]
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
    coopAvailable?: boolean | null
    specialisations?: string[] | null
}

interface ProgramCardProps {
    program: Program
    isLoggedIn: boolean
    universityId: string
    selected?: boolean
    onToggleSelect?: () => void
}

// ─── Test pill component ──────────────────────────────────────────────────────

function TestPill({ label, req, min, max }: {
    label: string
    req: string | null | undefined
    min?: number | null
    max?: number | null
}) {
    if (!req) return null

    if (req === 'NOT_REQUIRED') {
        return (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-gray-50 text-gray-400 border-gray-200">
                <XCircle className="h-3 w-3" />
                {label} not required
            </span>
        )
    }

    const isRequired = req === 'REQUIRED'
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium
            ${isRequired
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
        >
            {isRequired
                ? <CheckCircle className="h-3 w-3" />
                : <FlaskConical className="h-3 w-3" />
            }
            {label}
            {!isRequired && ' (rec.)'}
            {(min || max) && `: ${min ?? '?'}–${max ?? '?'}`}
        </span>
    )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProgramCard({ program, isLoggedIn, universityId, selected = false, onToggleSelect }: ProgramCardProps) {
    const anyTestSet = program.greRequired || program.gmatRequired ||
        program.satRequired || program.actRequired

    return (
        <Card className={`transition-all duration-150 ${
            selected
                ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
                : 'border-gray-200 hover:shadow-md'
        }`}>
            <CardContent className="p-5 space-y-4">

                {/* ── Row 1: Name + Badges ── */}
                <div>
                    <h3 className="font-semibold text-gray-900 text-base leading-snug mb-2">
                        {program.programName}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-[11px]">{program.degreeLevel}</Badge>
                        <Badge variant="outline" className="text-[11px]">{program.fieldCategory}</Badge>
                        {program.stemDesignated && (
                            <Badge className="text-[11px] bg-green-50 text-green-700 border border-green-200">
                                🔬 STEM
                            </Badge>
                        )}
                        {program.coopAvailable && (
                            <Badge className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                                💼 Co-op
                            </Badge>
                        )}
                    </div>
                </div>

                {/* ── Row 2: Core Stats ── */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-gray-600">
                    {program.durationMonths && (
                        <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            {program.durationMonths} months
                        </span>
                    )}
                    {program.tuitionFee && (
                        <span className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            {program.tuitionFee.toLocaleString()} {program.currency ?? 'USD'}/yr
                        </span>
                    )}
                    {program.intakes.length > 0 && (
                        <span className="flex items-center gap-1.5 col-span-2">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            {program.intakes.join(' · ')}
                        </span>
                    )}
                    {program.applicationFee && (
                        <span className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            App fee: {program.applicationFee} {program.applicationFeeCur ?? 'USD'}
                        </span>
                    )}
                    {program.appDeadlineType && (
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            {program.appDeadlineType === 'ROLLING'
                                ? 'Rolling deadline'
                                : program.appDeadlineDate
                                    ? `Due ${new Date(program.appDeadlineDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                    : 'Fixed deadline'
                            }
                        </span>
                    )}
                    {(program.workExpYears ?? 0) > 0 && (
                        <span className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            {program.workExpYears} yr work exp req.
                        </span>
                    )}
                </div>

                {/* ── Row 3: Academic Requirements ── */}
                {(program.minGpa || program.minPercentage || program.englishTests.length > 0) && (
                    <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Academic Requirements
                        </p>
                        {program.englishTests.length > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                <GraduationCap className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                {program.englishTests.join(', ')}
                                {program.minEnglishScore && (
                                    <span className="text-gray-500">— min {program.minEnglishScore}</span>
                                )}
                            </div>
                        )}
                        {program.minGpa && (
                            <p className="text-sm text-gray-700">
                                Min GPA: <span className="font-semibold">{program.minGpa}/4.0</span>
                            </p>
                        )}
                        {program.minPercentage && (
                            <p className="text-sm text-gray-700">
                                Min percentage: <span className="font-semibold">{program.minPercentage}%</span>
                            </p>
                        )}
                    </div>
                )}

                {/* ── Row 4: Standardised Tests ── */}
                {anyTestSet && (
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Standardised Tests
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {/* Required / Recommended first */}
                            {[
                                { label: 'GRE', req: program.greRequired, min: program.greMinScore, max: program.greMaxScore },
                                { label: 'GMAT', req: program.gmatRequired, min: program.gmatMinScore, max: program.gmatMaxScore },
                                { label: 'SAT', req: program.satRequired, min: program.satMinScore, max: program.satMaxScore },
                                { label: 'ACT', req: program.actRequired, min: program.actMinScore, max: program.actMaxScore },
                            ].filter(t => t.req && t.req !== 'NOT_REQUIRED').map(t => (
                                <TestPill key={t.label} {...t} />
                            ))}
                            {/* Not required — shown muted */}
                            {[
                                { label: 'GRE', req: program.greRequired },
                                { label: 'GMAT', req: program.gmatRequired },
                                { label: 'SAT', req: program.satRequired },
                                { label: 'ACT', req: program.actRequired },
                            ].filter(t => t.req === 'NOT_REQUIRED').map(t => (
                                <TestPill key={t.label} label={t.label} req={t.req} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Row 5: Scholarships ── */}
                {program.scholarshipAvail && program.scholarshipAvail !== 'NO' && (
                    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2.5">
                        <Award className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-yellow-800">
                                {program.scholarshipAvail === 'YES'
                                    ? '🎓 Scholarships available'
                                    : '🎓 Scholarships may be available'}
                            </p>
                            {program.scholarshipDetails && (
                                <p className="text-xs text-yellow-700 mt-0.5">{program.scholarshipDetails}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Row 6: Specialisations ── */}
                {program.specialisations && program.specialisations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-gray-400 font-medium">Tracks:</span>
                        {program.specialisations.map(s => (
                            <span key={s}
                                className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-0.5"
                            >
                                {s}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Row 7: Description ── */}
                {program.description && (
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                        {program.description}
                    </p>
                )}

                {/* ── Row 8: CTA ── */}
                <div className="pt-1 border-t border-gray-100">
                    {isLoggedIn ? (
                        onToggleSelect ? (
                            <Button
                                onClick={onToggleSelect}
                                variant={selected ? 'default' : 'outline'}
                                className={`w-full transition-all ${
                                    selected
                                        ? 'bg-green-600 hover:bg-green-700 border-green-600 text-white'
                                        : ''
                                }`}
                                size="sm"
                            >
                                {selected ? '✅ Selected' : '+ Select Programme'}
                            </Button>
                        ) : (
                            // Fallback: single-select mode (no ProgramsSection wrapper)
                            <Button className="w-full" size="sm" disabled>
                                Express Interest
                            </Button>
                        )
                    ) : (
                        <Button variant="outline" className="w-full" size="sm" asChild>
                            <a href="/student/register">
                                Register to Express Interest
                            </a>
                        </Button>
                    )}
                </div>

            </CardContent>
        </Card>
    )
}
