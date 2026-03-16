'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GraduationCap, MapPin, BookOpen, Calendar, Linkedin, ExternalLink } from 'lucide-react'
import AlumniConnectModal from './AlumniConnectModal'

type AlumniStatus = 'STUDENT_CURRENTLY' | 'OPT_CPT' | 'H1B_OTHER' | 'FURTHER_STUDIES' | 'OTHER'

interface AlumniCardProps {
    alumni: {
        id: string
        usUniversityName: string
        usProgram: string
        usDegreeLevel?: string | null
        usCity?: string | null
        alumniStatus: AlumniStatus
        availableFor: string[]
        helpTopics: string[]
        inspirationMessage?: string | null
        linkedinUrl?: string | null
        yearWentToUSA?: number | null
        availabilityNote?: string | null
        weeklyCapacity?: number | null
        isAtCapacity?: boolean
        profilePhotoUrl?: string | null
        user: { name?: string | null; image?: string | null }
        universityPartner?: { institutionName: string; logo?: string | null } | null
    }
}

const STATUS_CONFIG: Record<AlumniStatus, { label: string; emoji: string; className: string }> = {
    STUDENT_CURRENTLY: { label: 'Currently Studying', emoji: '📚', className: 'bg-blue-100 text-blue-700' },
    OPT_CPT:           { label: 'On OPT/CPT', emoji: '✈️', className: 'bg-purple-100 text-purple-700' },
    H1B_OTHER:         { label: 'Working (H1B)', emoji: '💼', className: 'bg-green-100 text-green-700' },
    FURTHER_STUDIES:   { label: 'Further Studies', emoji: '🎓', className: 'bg-indigo-100 text-indigo-700' },
    OTHER:             { label: 'Alumni', emoji: '⭐', className: 'bg-amber-100 text-amber-700' },
}

const TOPIC_LABEL: Record<string, string> = {
    CHOOSING_UNIVERSITY: 'Choosing University',
    FIRST_SEMESTER:      'First Semester',
    INTERNSHIPS_JOBS:    'Internships & Jobs',
    LIFE_IN_US:          'Life in the US',
    OTHER:               'Other',
}

export default function AlumniCard({ alumni }: AlumniCardProps) {
    const [modalOpen, setModalOpen] = useState(false)
    const status = STATUS_CONFIG[alumni.alumniStatus]
    const name = alumni.user.name ?? 'IAES Alumnus'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const showConnect = !alumni.availableFor.includes('NOT_NOW')

    return (
        <>
            <Card className="group relative overflow-hidden border border-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 bg-white">
                {/* Gold top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

                <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start gap-3 mb-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {alumni.profilePhotoUrl || alumni.user.image ? (
                                <img
                                    src={alumni.profilePhotoUrl ?? alumni.user.image!}
                                    alt={name}
                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-100"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-amber-100">
                                    {initials}
                                </div>
                            )}
                            {alumni.isAtCapacity && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white" title="Fully booked this week" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">
                                    <GraduationCap className="w-2.5 h-2.5" /> IAES Alumni
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {alumni.usProgram}
                                {alumni.usDegreeLevel && ` · ${alumni.usDegreeLevel}`}
                            </p>
                        </div>
                    </div>

                    {/* University */}
                    <div className="flex items-center gap-1.5 mb-3">
                        {alumni.universityPartner?.logo ? (
                            <img src={alumni.universityPartner.logo} alt="" className="w-4 h-4 rounded object-contain" />
                        ) : (
                            <BookOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        )}
                        <p className="text-xs font-medium text-gray-700 truncate">{alumni.usUniversityName}</p>
                    </div>

                    {/* Chips row */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                            {status.emoji} {status.label}
                        </span>
                        {alumni.usCity && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-gray-100">
                                <MapPin className="w-2.5 h-2.5" /> {alumni.usCity}
                            </span>
                        )}
                        {alumni.yearWentToUSA && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-gray-100">
                                <Calendar className="w-2.5 h-2.5" /> Class of {alumni.yearWentToUSA}
                            </span>
                        )}
                    </div>

                    {/* Help topics */}
                    {alumni.helpTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {alumni.helpTopics.slice(0, 3).map(t => (
                                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-700">
                                    {TOPIC_LABEL[t] ?? t}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Inspiration message */}
                    {alumni.inspirationMessage && (
                        <blockquote className="border-l-2 border-amber-300 pl-3 mb-4">
                            <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-3">
                                "{alumni.inspirationMessage}"
                            </p>
                        </blockquote>
                    )}

                    {/* Availability note */}
                    {alumni.availabilityNote && (
                        <p className="text-[10px] text-gray-400 mb-3">🕐 {alumni.availabilityNote}</p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                        {alumni.linkedinUrl && (
                            <a href={alumni.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                title="LinkedIn">
                                <Linkedin className="w-3.5 h-3.5" />
                            </a>
                        )}
                        {showConnect ? (
                            <Button
                                size="sm"
                                onClick={() => setModalOpen(true)}
                                disabled={alumni.isAtCapacity}
                                className="ml-auto h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-sm"
                            >
                                {alumni.isAtCapacity ? '📅 Fully Booked' : 'Connect →'}
                            </Button>
                        ) : (
                            <span className="ml-auto text-[10px] text-gray-400">Not taking requests</span>
                        )}
                    </div>
                </div>
            </Card>

            <AlumniConnectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                alumni={{
                    id: alumni.id,
                    name,
                    usUniversityName: alumni.usUniversityName,
                    usProgram: alumni.usProgram,
                    availableFor: alumni.availableFor,
                    linkedinUrl: alumni.linkedinUrl,
                    isAtCapacity: alumni.isAtCapacity,
                }}
            />
        </>
    )
}
