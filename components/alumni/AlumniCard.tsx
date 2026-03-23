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
    STUDENT_CURRENTLY: { label: 'Currently Studying', emoji: '📚', className: 'bg-[#F0F2FF] text-[#0B1340]' },
    OPT_CPT:           { label: 'On OPT/CPT', emoji: '✈️', className: 'bg-[#E8EAF6] text-[#0B1340]' },
    H1B_OTHER:         { label: 'Working (H1B)', emoji: '💼', className: 'bg-[#EAF3DE] text-[#27500A]' },
    FURTHER_STUDIES:   { label: 'Further Studies', emoji: '🎓', className: 'bg-[#FDF6E3] text-[#633806]' },
    OTHER:             { label: 'Alumni', emoji: '⭐', className: 'bg-[#FFF3E0] text-[#E65100]' },
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
            <div className="glass-card-gold hover-lift rounded-2xl overflow-hidden relative flex flex-col justify-between group h-full">
                {/* Gold top accent */}
                <div className="h-[3px] w-full" style={{ backgroundColor: '#C9A84C' }} />

                <div className="p-5 flex-1 flex flex-col">
                    {/* Header row */}
                    <div className="flex items-start gap-4 mb-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {alumni.profilePhotoUrl || alumni.user.image ? (
                                <img
                                    src={alumni.profilePhotoUrl ?? alumni.user.image!}
                                    alt={name}
                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-white/50 shadow-sm"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-indigo-gradient flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/50 shadow-sm">
                                    {initials}
                                </div>
                            )}
                            {alumni.isAtCapacity && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white" title="Fully booked this week" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                            <p className="truncate mb-0.5 leading-tight" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 16, color: '#0B1340' }}>
                                {name}
                            </p>
                            <p className="truncate leading-tight" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#888888' }}>
                                {alumni.usUniversityName}
                                {alumni.usDegreeLevel && ` · ${alumni.usDegreeLevel}`}
                            </p>
                        </div>
                    </div>

                    {/* Chips row */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-[700] px-2.5 py-1 rounded-full ${status.className}`} style={{ fontFamily: 'var(--font-jakarta)' }}>
                            {status.emoji} {status.label}
                        </span>
                        {alumni.usCity && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-[500]" style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: '#888888', fontFamily: 'var(--font-jakarta)' }}>
                                <MapPin className="w-2.5 h-2.5" /> {alumni.usCity}
                            </span>
                        )}
                        {alumni.yearWentToUSA && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-[500]" style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: '#888888', fontFamily: 'var(--font-jakarta)' }}>
                                <Calendar className="w-2.5 h-2.5" /> Class of {alumni.yearWentToUSA}
                            </span>
                        )}
                    </div>

                    {/* Help topics (gold pills) */}
                    {alumni.helpTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {alumni.helpTopics.slice(0, 3).map(t => (
                                <span key={t} className="inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border" style={{ backgroundColor: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.2)', color: '#A8873A', fontFamily: 'var(--font-jakarta)' }}>
                                    {TOPIC_LABEL[t] ?? t}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Inspiration message */}
                    {alumni.inspirationMessage && (
                        <blockquote className="border-l-[3px] border-[#C9A84C] pl-3 mb-4 py-1">
                            <p className="text-[12px] italic leading-relaxed line-clamp-3" style={{ color: '#888888', fontFamily: 'var(--font-jakarta)' }}>
                                "{alumni.inspirationMessage}"
                            </p>
                        </blockquote>
                    )}

                    {/* Spacer to push connect button to bottom */}
                    <div className="mt-auto" />

                    {/* Availability note */}
                    {alumni.availabilityNote && (
                        <p className="text-[11px] text-[#888888] mb-3 font-medium" style={{ fontFamily: 'var(--font-jakarta)' }}>
                            <span className="inline-block mr-1">🕐</span> {alumni.availabilityNote}
                        </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-2 pt-3 border-t border-[#C9A84C]/20 mt-2">
                        {alumni.linkedinUrl && (
                            <a href={alumni.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-white/50 rounded-lg transition-colors"
                                title="LinkedIn">
                                <Linkedin className="w-4 h-4" />
                            </a>
                        )}
                        {showConnect ? (
                            <button
                                onClick={() => setModalOpen(true)}
                                disabled={alumni.isAtCapacity}
                                className="ml-auto w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                                style={{ 
                                    backgroundColor: '#C9A84C', 
                                    color: '#0B1340', 
                                    opacity: alumni.isAtCapacity ? 0.5 : 1, 
                                    cursor: alumni.isAtCapacity ? 'not-allowed' : 'pointer',
                                    fontFamily: 'var(--font-jakarta)',
                                    boxShadow: '0 4px 12px rgba(201,168,76,0.2)'
                                }}
                                onMouseOver={(e) => { if (!alumni.isAtCapacity) e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)'; }}
                                onMouseOut={(e) => { if (!alumni.isAtCapacity) e.currentTarget.style.transform = 'scale(1) translateY(0)'; }}
                            >
                                {alumni.isAtCapacity ? '📅 Fully Booked' : 'Connect →'}
                            </button>
                        ) : (
                            <span className="ml-auto text-[11px] font-medium" style={{ color: '#888888', fontFamily: 'var(--font-jakarta)' }}>Not taking requests</span>
                        )}
                    </div>
                </div>
            </div>

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
