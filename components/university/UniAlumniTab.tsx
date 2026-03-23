import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { GraduationCap, BookOpen, MapPin, Mail, ExternalLink, Users, UserCheck, Clock } from 'lucide-react'
import { AlumniInviteModal } from '@/components/alumni/AlumniInviteModal'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    STUDENT_CURRENTLY: { label: 'Currently Studying', color: 'bg-blue-100 text-blue-700' },
    OPT_CPT:           { label: 'OPT/CPT',            color: 'bg-purple-100 text-purple-700' },
    H1B_PENDING:       { label: 'H1B Pending',        color: 'bg-yellow-100 text-yellow-700' },
    H1B_APPROVED:      { label: 'Working (H1B)',       color: 'bg-green-100 text-green-700' },
    H1B_OTHER:         { label: 'Working (H1B)',       color: 'bg-green-100 text-green-700' },
    GREEN_CARD:        { label: 'Permanent Resident',  color: 'bg-emerald-100 text-emerald-700' },
    PR_OTHER_COUNTRY:  { label: 'PR Abroad',           color: 'bg-teal-100 text-teal-700' },
    EMPLOYED_USA:      { label: 'Employed in USA',     color: 'bg-green-100 text-green-700' },
    FURTHER_STUDIES:   { label: 'Further Studies',     color: 'bg-indigo-100 text-indigo-700' },
    RETURNED_HOME:     { label: 'Returned Home',       color: 'bg-slate-100 text-slate-600' },
    OTHER:             { label: 'Alumni',              color: 'bg-gray-100 text-gray-600' },
}

interface Props {
    universityId: string
    universityName: string
}

export async function UniAlumniTab({ universityId, universityName }: Props) {
    const ALUMNI_TAB_SELECT = {
        id: true,
        usUniversityName: true,
        usProgram: true,
        alumniStatus: true,
        yearWentToUSA: true,
        usCity: true,
        helpTopics: true,
        availableFor: true,
        inspirationMessage: true,
        weeklyCapacity: true,
        showLinkedin: true,
        linkedinUrl: true,
        adminReviewStatus: true,
        user: { select: { name: true } },
    } satisfies Prisma.AlumniSelect;

    type AlumniTabItem = Prisma.AlumniGetPayload<{ select: typeof ALUMNI_TAB_SELECT }>;

    const alumniData = await prisma.alumni.findMany({
        where: {
            isVerified: true,
            adminReviewStatus: { not: 'SUSPENDED' },
            OR: [
                { usUniversityId: universityId },
                { usUniversityName: { contains: universityName, mode: 'insensitive' } }
            ]
        },
        select: ALUMNI_TAB_SELECT,
        take: 50,
    }).catch(() => [])

    const alumni = alumniData as AlumniTabItem[]

    // Pending invitations this university sent
    const pendingInvites = await prisma.alumniInvitation.count({
        where: { universityId, status: 'PENDING' },
    }).catch(() => 0)

    const totalAlumni = alumni.length
    const available = alumni.filter(a => a.weeklyCapacity && a.weeklyCapacity > 0).length
    const pending = alumni.filter(a => a.adminReviewStatus === 'PENDING_REVIEW').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-amber-500" />
                        Alumni from {universityName}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        IAES graduates who listed your university on the Alumni Bridge
                    </p>
                </div>
                <AlumniInviteModal 
                    universityId={universityId} 
                    universityName={universityName} 
                />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { icon: Users,     label: 'Total Alumni',     value: totalAlumni, color: 'text-slate-700' },
                    { icon: UserCheck, label: 'Open for Mentoring', value: available,  color: 'text-green-600' },
                    { icon: Clock,     label: 'Pending Review',   value: pending,     color: 'text-amber-600' },
                    { icon: Mail,      label: 'Invites Sent',     value: pendingInvites, color: 'text-indigo-600' },
                ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-center">
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* Alumni list */}
            {alumni.length === 0 ? (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-12 text-center">
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="h-7 w-7 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">No Alumni Registered Yet</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                        IAES graduates who attended {universityName} haven't joined yet.
                        Share the Alumni Bridge link with your IAES alumni community to invite them.
                    </p>
                    <AlumniInviteModal 
                        universityId={universityId} 
                        universityName={universityName}
                        trigger={
                            <button className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm shadow-sm">
                                Share Alumni Bridge Invitation
                            </button>
                        }
                    />
                </div>
            ) : (
                <div className="glass-card-gold border border-[#F4E9CD] rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#F4E9CD]/50 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">{totalAlumni} alumni found</p>
                        <span className="text-xs text-slate-400">Sorted by most recent</span>
                    </div>
                    <div className="divide-y divide-[#F4E9CD]/30">
                        {alumni.map(a => {
                            const status = STATUS_LABEL[a.alumniStatus] ?? { label: 'Alumni', color: 'bg-gray-100 text-gray-600' }
                            const initials = (a.user?.name ?? 'A').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            const isAvailable = a.weeklyCapacity && a.weeklyCapacity > 0

                            return (
                                <div key={a.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {initials}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <div>
                                                <p className="font-semibold text-slate-900 text-sm">{a.user?.name ?? 'Alumni'}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 flex-wrap">
                                                    <BookOpen className="h-3 w-3 flex-shrink-0" />
                                                    <span className="truncate">{a.usProgram}</span>
                                                    {a.yearWentToUSA && <>
                                                        <span>·</span>
                                                        <span>{a.yearWentToUSA}</span>
                                                    </>}
                                                    {a.usCity && (
                                                        <>
                                                            <span>·</span>
                                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                                            <span>{a.usCity}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                {isAvailable
                                                    ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">✓ Open to mentor</span>
                                                    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">Not available</span>
                                                }
                                            </div>
                                        </div>

                                        {a.inspirationMessage && (
                                            <p className="mt-1.5 text-xs text-slate-400 italic line-clamp-1">"{a.inspirationMessage}"</p>
                                        )}

                                        {/* Topics */}
                                        {a.helpTopics.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {a.helpTopics.slice(0, 3).map((t: string) => (
                                                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border border-amber-100 text-amber-600 bg-amber-50">
                                                        {t.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {a.showLinkedin && a.linkedinUrl && (
                                            <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700 transition-colors">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                        <span className="text-[10px] text-slate-400 italic">
                                            Connect via Alumni Bridge
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
