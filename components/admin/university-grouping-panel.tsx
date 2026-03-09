'use client'

import { useState, useTransition } from 'react'
import { Building2, Network, GraduationCap, CheckCircle2, Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { setUniversityGrouping, linkSchoolToParent } from '@/app/(admin)/admin/actions/university-grouping'

type UniversityType = 'STANDALONE' | 'PARENT' | 'SCHOOL'

interface School {
    id: string
    institutionName: string
    verificationStatus: string
}

interface ParentOption {
    id: string
    institutionName: string
    groupSlug: string | null
}

interface Props {
    universityId: string
    currentType: UniversityType
    currentGroupSlug: string | null
    currentParentId: string | null
    currentParentName: string | null
    schools: School[]           // schools under this university (if it's a parent)
    availableParents: ParentOption[]  // VERIFIED parent universities for the dropdown
}

export function UniversityGroupingPanel({
    universityId,
    currentType,
    currentGroupSlug,
    currentParentId,
    currentParentName,
    schools,
    availableParents,
}: Props) {
    const [type, setType] = useState<UniversityType>(currentType)
    const [groupSlug, setGroupSlug] = useState(currentGroupSlug ?? '')
    const [parentId, setParentId] = useState(currentParentId ?? '')
    const [linkSchoolId, setLinkSchoolId] = useState('')
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleSave() {
        setMessage(null)
        startTransition(async () => {
            const result = await setUniversityGrouping({
                universityId,
                type,
                groupSlug: groupSlug.trim() || null,
                parentId: parentId || null,
            })
            if (result.error) setMessage({ text: result.error, ok: false })
            else setMessage({ text: 'Grouping saved successfully.', ok: true })
        })
    }

    function handleLink() {
        if (!linkSchoolId) return
        setMessage(null)
        startTransition(async () => {
            const result = await linkSchoolToParent(linkSchoolId, universityId)
            if (result.error) setMessage({ text: result.error, ok: false })
            else {
                setMessage({ text: 'School linked successfully.', ok: true })
                setLinkSchoolId('')
            }
        })
    }

    const TYPE_OPTIONS: { value: UniversityType; label: string; icon: React.ReactNode; desc: string }[] = [
        {
            value: 'STANDALONE',
            label: 'Standalone',
            icon: <Building2 className="h-4 w-4" />,
            desc: 'Independent institution — no grouping. Default for all existing universities.',
        },
        {
            value: 'PARENT',
            label: 'Parent Institution',
            icon: <Network className="h-4 w-4" />,
            desc: 'Top-level group (e.g. Arizona State University). Schools are linked under this.',
        },
        {
            value: 'SCHOOL',
            label: 'School / Faculty',
            icon: <GraduationCap className="h-4 w-4" />,
            desc: 'Part of a Parent Institution (e.g. ASU — W.P. Carey School of Business).',
        },
    ]

    return (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <Network className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900">Institution Grouping</h3>
                <Badge variant="outline" className="ml-auto text-xs">
                    {currentType === 'PARENT' ? '🏛️ Parent' : currentType === 'SCHOOL' ? '🏫 School' : '— Standalone'}
                </Badge>
            </div>

            <div className="p-5 space-y-5">
                {/* Type selector */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Institution Type</label>
                    <div className="space-y-2">
                        {TYPE_OPTIONS.map(opt => (
                            <label
                                key={opt.value}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${type === opt.value
                                        ? 'border-indigo-300 bg-indigo-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="uni-type"
                                    value={opt.value}
                                    checked={type === opt.value}
                                    onChange={() => setType(opt.value)}
                                    className="mt-0.5 accent-indigo-600"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                                        {opt.icon} {opt.label}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Group Slug — shown for PARENT */}
                {type === 'PARENT' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Group Slug <span className="text-red-400">*</span>
                        </label>
                        <Input
                            value={groupSlug}
                            onChange={e => setGroupSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            placeholder="arizona-state-university"
                            className="text-sm"
                        />
                        <p className="text-xs text-gray-400">
                            Used in the shared URL: <code>/universities/{groupSlug || 'your-slug'}</code>. Lowercase, hyphens only.
                        </p>
                    </div>
                )}

                {/* Parent selector — shown for SCHOOL */}
                {type === 'SCHOOL' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Parent Institution <span className="text-red-400">*</span>
                        </label>
                        {availableParents.length === 0 ? (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                No parent institutions found. First set another university as "Parent Institution."
                            </p>
                        ) : (
                            <select
                                value={parentId}
                                onChange={e => setParentId(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                <option value="">Select parent…</option>
                                {availableParents.map(p => (
                                    <option key={p.id} value={p.id}>{p.institutionName}</option>
                                ))}
                            </select>
                        )}
                        {currentParentName && (
                            <p className="text-xs text-indigo-600">Currently under: <strong>{currentParentName}</strong></p>
                        )}
                    </div>
                )}

                {/* Save button */}
                <Button
                    onClick={handleSave}
                    disabled={isPending}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save Grouping
                </Button>

                {/* Feedback */}
                {message && (
                    <p className={`text-sm px-3 py-2 rounded-lg border ${message.ok
                            ? 'bg-green-50 text-green-800 border-green-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                        {message.text}
                    </p>
                )}

                {/* Schools under this parent — only shown if it IS a parent */}
                {currentType === 'PARENT' && (
                    <div className="pt-2 border-t border-gray-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Schools under this parent ({schools.length})
                            </p>
                        </div>

                        {schools.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No schools linked yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {schools.map(s => (
                                    <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                                        <GraduationCap className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                        <span className="flex-1 font-medium text-gray-800 truncate">{s.institutionName}</span>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs shrink-0 ${s.verificationStatus === 'VERIFIED'
                                                    ? 'border-green-200 text-green-700'
                                                    : 'border-amber-200 text-amber-700'
                                                }`}
                                        >
                                            {s.verificationStatus === 'VERIFIED' ? '✅ Verified' : '⏳ Pending'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Link another school */}
                        <div className="flex gap-2 pt-1">
                            <select
                                value={linkSchoolId}
                                onChange={e => setLinkSchoolId(e.target.value)}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                <option value="">Link an existing university…</option>
                                {availableParents
                                    .filter(p => p.id !== universityId)
                                    .map(p => (
                                        <option key={p.id} value={p.id}>{p.institutionName}</option>
                                    ))
                                }
                            </select>
                            <Button
                                onClick={handleLink}
                                disabled={!linkSchoolId || isPending}
                                size="sm"
                                variant="outline"
                                className="gap-1.5 shrink-0"
                            >
                                <Link2 className="h-4 w-4" /> Link
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
