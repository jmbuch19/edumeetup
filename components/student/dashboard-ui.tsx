'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, MapPin, Search, Calendar, CheckCircle, LogOut, Clock, ExternalLink, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StudentMeetingsTable } from '@/components/student/student-meetings-table'
import { AdvisoryBanner } from '@/components/student/advisory-banner'
import { AdvisoryForm } from '@/components/student/advisory-form'
import { expressInterest } from '@/app/actions'
import { NotificationsCenter } from '@/components/notifications-center'
import { UniversityLogo } from '@/components/university/university-logo'
import GroupSessionList, { DiscoverSessionCard } from '@/components/student/GroupSessionCard'
import { type StudentGroupSession, type DiscoverableGroupSession } from '@/app/university/actions/group-sessions'
import AlumniBridgeSection from '@/components/alumni/AlumniBridgeSection'

// Types
// Types
// Types
type Program = any
type University = any
type MeetingParticipant = any
type Meeting = any
type AdvisoryRequest = any

// Extended types for relations
type ExtendedProgram = Program & { university: University }
type ExtendedUniversity = University & { programs: Program[] }
type ExtendedMeeting = MeetingParticipant & { meeting: Meeting & { university: University } }

interface DashboardUIProps {
    student: { fullName: string; fieldOfInterest: string | null; preferredDegree: string | null; user: { email: string } }
    matchedPrograms: any[] // Serialized ExtendedProgram
    recommendedUniversities: any[] // Serialized ExtendedUniversity
    myMeetings: any[] // Serialized ExtendedMeeting
    interestedUniIds: string[] // Changed from Set to Array for serialization
    advisoryStatus: any // Serialized AdvisoryRequest
    hasCv: boolean
    groupSessions: StudentGroupSession[]
    discoverableSessions: DiscoverableGroupSession[]
}

export function DashboardUI({
    student,
    matchedPrograms,
    recommendedUniversities,
    myMeetings,
    interestedUniIds, // Now an Array
    advisoryStatus,
    hasCv,
    groupSessions,
    discoverableSessions,
}: DashboardUIProps) {
    // Re-create Set for internal use if needed, or just use includes
    const interestedSet = new Set(interestedUniIds)
    const [activeTab, setActiveTab] = useState('overview')
    const [loadingAction, setLoadingAction] = useState<string | null>(null)
    const router = useRouter()

    const handleAction = async (type: 'interest' | 'meeting' | 'question', programId: string, universityId: string, message?: string) => {
        setLoadingAction(`${type}-${programId}`)
        try {
            const endpoint = type === 'interest' ? 'interest' : type === 'meeting' ? 'meeting-request' : 'question'
            const res = await fetch(`/api/student/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ programId, universityId, message })
            })
            
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Request failed')
            }
            
            alert(type === 'interest' ? 'Interest sent successfully!' : type === 'meeting' ? 'Meeting request sent!' : 'Question sent successfully!')
            router.refresh()
        } catch (error: any) {
            console.error(error)
            alert(error.message || 'Something went wrong')
        } finally {
            setLoadingAction(null)
        }
    }

    const completeness = 50 + (student.fieldOfInterest ? 15 : 0) + (student.preferredDegree ? 15 : 0) + (hasCv ? 20 : 0)
    
    // Dynamic greeting based on time of day
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,'

    const tabClasses = "rounded-none border-b-2 border-transparent bg-transparent p-0 pb-3 text-[14px] font-medium text-[#888888] transition-all duration-200 hover:text-[#0B1340] hover:border-[#E8EAF6] data-[state=active]:border-[#C9A84C] data-[state=active]:text-[#0B1340] data-[state=active]:font-[600] data-[state=active]:shadow-none data-[state=active]:bg-transparent"
    const tabStyle = { fontFamily: 'var(--font-jakarta)' }

    return (
        <div className="w-full pb-8">
            {/* ── Dashboard Hero / Welcome Banner ── */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-indigo-gradient mb-8 p-8 md:p-10 shadow-xl border border-indigo-900/50">
                {/* Subtle radial glow */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" 
                     style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0) 70%)' }} />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    {/* Left: Greeting */}
                    <div className="flex-1">
                        <p className="text-[14px] font-medium" style={{ color: '#AAAACC', fontFamily: 'var(--font-jakarta)' }}>
                            {greeting}
                        </p>
                        <h1 className="text-4xl md:text-[36px] text-white my-2 leading-tight" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 900 }}>
                            {student.fullName}
                        </h1>
                        <p className="text-[14px] font-medium" style={{ color: '#C9A84C', fontFamily: 'var(--font-jakarta)' }}>
                            {student.preferredDegree || 'Degree Not Set'} in {student.fieldOfInterest || 'Field Not Selected'}
                        </p>
                    </div>

                    {/* Right: Profile Completeness Glass Card */}
                    <div className="glass-card rounded-2xl p-6 w-full md:w-[280px] shrink-0">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: '#888888', fontFamily: 'var(--font-jakarta)' }}>
                                Profile Strength
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-[48px] leading-none text-[#0B1340]" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 900 }}>
                                {completeness}
                            </span>
                            <span className="text-lg font-bold text-[#0B1340] opacity-60">%</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-2.5 w-full rounded-full overflow-hidden mb-5" style={{ backgroundColor: '#E8EAF6' }}>
                            <div className="h-full rounded-full animate-shimmer" 
                                 style={{ 
                                     width: `${completeness}%`, 
                                     backgroundColor: '#C9A84C',
                                     background: 'linear-gradient(90deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)',
                                     backgroundSize: '200% auto'
                                 }} 
                            />
                        </div>

                        {/* CTA */}
                        <Link href="/student/profile" className="block w-full">
                            <button className={`w-full py-2.5 rounded-lg text-sm font-bold text-[#0B1340] transition-colors ${completeness < 100 ? 'animate-pulse-gold hover:opacity-90' : 'hover:opacity-90'}`}
                                    style={{ backgroundColor: '#C9A84C', fontFamily: 'var(--font-jakarta)' }}>
                                {completeness < 100 ? 'Complete Profile' : 'Update Profile'}
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <NotificationsCenter userRole="STUDENT" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                {/* ── Dashboard Tabs ── */}
                <TabsList className="w-full bg-white border-b border-[#E8EAF6] rounded-none p-0 pb-[2px] flex flex-nowrap overflow-x-auto overflow-y-hidden justify-start h-auto gap-6 md:gap-8 no-scrollbar scrollbar-hide shrink-0">
                    <TabsTrigger value="overview" className={tabClasses} style={tabStyle}>
                        Overview
                    </TabsTrigger>

                    <TabsTrigger value="group-sessions" className={`${tabClasses} relative`} style={tabStyle}>
                        Group Sessions
                        {groupSessions.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center
                                rounded-full text-white text-[11px]
                                font-bold px-1.5 py-0.5 min-w-[1.25rem]"
                                style={{ backgroundColor: '#0B1340' }}>
                                {groupSessions.length}
                            </span>
                        )}
                    </TabsTrigger>

                    <TabsTrigger value="advisory" className={`${tabClasses} relative`} style={tabStyle}>
                        Guided Pathway
                        {advisoryStatus && advisoryStatus.status === 'NEW' && (
                            <span className="absolute -top-1 -right-3 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: '#C9A84C' }}></span>
                        )}
                        {advisoryStatus && advisoryStatus.status === 'COMPLETED' && (
                            <span className="absolute -top-1 -right-3 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                        )}
                    </TabsTrigger>

                    <TabsTrigger value="alumni" className={`${tabClasses} relative`} style={tabStyle}>
                        <span className="flex items-center gap-1.5">
                            Alumni Bridge 🌉
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse-gold" />
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-12">
                    {/* Advisory Banner (Only if not already requested/completed, or maybe always?) */}
                    {/* User requested non-intrusive banner */}
                    {!advisoryStatus && (
                        <AdvisoryBanner onOpen={() => setActiveTab('advisory')} />
                    )}

                    {/* CV Upload Nudge — shown only when no CV uploaded yet */}
                    {!hasCv && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-2xl shrink-0">📄</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-amber-900">Upload your CV to stand out</p>
                                    <p className="text-xs text-amber-700 mt-0.5">Universities and advisors can review your profile faster with a CV attached.</p>
                                </div>
                            </div>
                            <Link href="/student/profile" className="sm:shrink-0">
                                <Button size="sm" variant="outline" className="w-full sm:w-auto border-amber-300 text-amber-800 hover:bg-amber-100 whitespace-nowrap">Upload CV →</Button>
                            </Link>
                        </div>
                    )}

                    {/* My Meetings Section */}
                    {myMeetings.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-serif text-indigo-900 mb-6 flex items-center gap-2">
                                <Calendar className="h-6 w-6 text-indigo-600" />
                                My Meetings
                            </h2>
                            <StudentMeetingsTable meetings={myMeetings} />
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-indigo-800">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Matches Found</h3>
                            <p className="text-2xl font-bold text-indigo-900">{matchedPrograms.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-indigo-800">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Your Interest</h3>
                            <p className="text-sm font-bold text-indigo-900">{student.fieldOfInterest}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-indigo-800">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Target Degree</h3>
                            <p className="text-sm font-bold text-indigo-900">{student.preferredDegree}</p>
                        </div>
                    </div>

                    {/* Matched Programs */}
                    <div>
                        <h2 className="text-2xl font-serif text-indigo-900 mb-6 flex items-center gap-2">
                            <GraduationCap className="h-6 w-6 text-indigo-600" />
                            Programs Matching Your Profile
                        </h2>

                        {matchedPrograms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-12 rounded-2xl border border-[#E8EAF6]" style={{ backgroundColor: '#F0F2FF' }}>
                                <GraduationCap className="h-12 w-12 mb-4 animate-float" style={{ color: '#C9A84C' }} />
                                <h3 className="mb-2" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 20, color: '#0B1340' }}>No Matches Found</h3>
                                <p className="mb-6 max-w-sm" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#888888' }}>
                                    Try changing your Field of Interest or Degree Level in your profile to see recommended programs.
                                </p>
                                <Link href="/student/profile">
                                    <button className="px-5 py-2.5 rounded-lg text-sm font-bold hover-lift transition-transform" style={{ backgroundColor: '#C9A84C', color: '#0B1340', fontFamily: 'var(--font-jakarta)' }}>
                                        Update Profile
                                    </button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {matchedPrograms.map((program: any, index: number) => {
                                    const isInterested = interestedSet.has(program.universityId)
                                    return (
                                        <div key={program.id} 
                                             className="glass-card hover-lift animate-pop rounded-2xl overflow-hidden relative flex flex-col justify-between group"
                                             style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
                                        >
                                            {/* Top accent bar */}
                                            <div className="h-[3px] w-full transition-colors duration-200" style={{ backgroundColor: '#C9A84C' }} />
                                            
                                            <div className="p-6 flex-1 flex flex-col">
                                                {/* Header: Logo, Name, Location, HOT Badge */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex gap-3">
                                                        {/* Logo */}
                                                        <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-white overflow-hidden" style={{ border: '1px solid #E8EAF6' }}>
                                                             <UniversityLogo src={program.university?.logo} alt={program.university?.institutionName ?? 'Uni Logo'} size="sm" />
                                                        </div>
                                                        <div>
                                                            <h3 className="leading-tight" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 18, color: '#0B1340' }}>
                                                                {program.university?.institutionName ?? 'Unknown Uni'}
                                                            </h3>
                                                            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#888888' }}>
                                                                {program.university?.city}, {program.university?.country}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* HOT Badge */}
                                                    <div className="animate-pulse-gold rounded-full px-2 py-0.5 whitespace-nowrap" 
                                                         style={{ backgroundColor: '#C9A84C', color: '#0B1340', fontFamily: 'var(--font-jakarta)', fontSize: 11, fontWeight: 700 }}>
                                                        HOT MATCH
                                                    </div>
                                                </div>

                                                {/* Program Name */}
                                                <h4 className="font-bold text-[#0B1340] mb-3 text-sm">{program.programName}</h4>

                                                {/* Program tags */}
                                                <div className="flex flex-wrap gap-2 mb-6">
                                                    <span className="px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#E8EAF6', color: '#0B1340', fontFamily: 'var(--font-jakarta)', fontSize: 11 }}>
                                                        {program.currency ?? 'USD'} {(program.tuitionFee ?? 0).toLocaleString()}
                                                    </span>
                                                    <span className="px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#E8EAF6', color: '#0B1340', fontFamily: 'var(--font-jakarta)', fontSize: 11 }}>
                                                        {program.durationMonths ?? 12} Months
                                                    </span>
                                                </div>

                                                {/* Spacer to push actions to bottom */}
                                                <div className="mt-auto" />

                                                {/* Bottom action row */}
                                                {isInterested ? (
                                                    <div className="flex gap-2 w-full mt-4">
                                                        <Link href={`/universities/${program.universityId}`} className="flex-1">
                                                            <button className="w-full py-2 rounded-lg text-xs font-semibold hover-lift"
                                                                style={{ border: '1px solid #0B1340', color: '#0B1340', transition: 'all 0.2s ease', backgroundColor: 'transparent' }}
                                                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0B1340'; e.currentTarget.style.color = '#fff' }}
                                                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#0B1340' }}>
                                                                View Details
                                                            </button>
                                                        </Link>
                                                        <button disabled className="flex-1 rounded-lg text-xs font-semibold py-2"
                                                            style={{ backgroundColor: '#E8EAF6', color: '#888888' }}>
                                                            Interest Sent
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2 w-full mt-4">
                                                        <button 
                                                            onClick={() => handleAction('interest', program.id, program.universityId)} 
                                                            disabled={loadingAction === `interest-${program.id}`}
                                                            className="w-full py-2.5 rounded-lg text-xs font-semibold hover-lift transition-colors block"
                                                            style={{ backgroundColor: '#C9A84C', color: '#0B1340' }}
                                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#A8873A'}
                                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#C9A84C'}
                                                        >
                                                            {loadingAction === `interest-${program.id}` ? 'Sending...' : 'Express Interest'}
                                                        </button>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleAction('meeting', program.id, program.universityId)} 
                                                                disabled={loadingAction === `meeting-${program.id}`}
                                                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold hover-lift transition-all"
                                                                style={{ border: '1px solid #0B1340', color: '#0B1340', backgroundColor: 'transparent' }}
                                                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0B1340'; e.currentTarget.style.color = '#fff' }}
                                                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#0B1340' }}
                                                            >
                                                                {loadingAction === `meeting-${program.id}` ? '...' : 'Request Meeting'}
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    const msg = window.prompt("What would you like to ask the university?")
                                                                    if (msg && msg.trim()) {
                                                                        handleAction('question', program.id, program.universityId, msg)
                                                                    }
                                                                }} 
                                                                disabled={loadingAction === `question-${program.id}`}
                                                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold hover-lift transition-all"
                                                                style={{ border: '1px solid #0B1340', color: '#0B1340', backgroundColor: 'transparent' }}
                                                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0B1340'; e.currentTarget.style.color = '#fff' }}
                                                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#0B1340' }}
                                                            >
                                                                {loadingAction === `question-${program.id}` ? '...' : 'Ask Question'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Recommended Unis */}
                    <div>
                        <h2 className="text-2xl font-serif text-indigo-900 mb-6">Other Recommended Universities</h2>
                        {recommendedUniversities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-12 rounded-2xl border border-[#E8EAF6]" style={{ backgroundColor: '#F0F2FF' }}>
                                <BookOpen className="h-12 w-12 mb-4 animate-float" style={{ color: '#C9A84C' }} />
                                <h3 className="mb-2" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 20, color: '#0B1340' }}>No Universities Found</h3>
                                <p className="mb-6 max-w-sm" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#888888' }}>
                                    We are constantly adding new university partners. Check back later for fresh recommendations!
                                </p>
                                <Link href="/student/profile">
                                    <button className="px-5 py-2.5 rounded-lg text-sm font-bold hover-lift transition-transform" style={{ backgroundColor: '#C9A84C', color: '#0B1340', fontFamily: 'var(--font-jakarta)' }}>
                                        Explore Universities
                                    </button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {recommendedUniversities.map((uni, index) => (
                                    <div key={uni.id} 
                                         className="glass-card hover-lift animate-pop rounded-2xl overflow-hidden relative flex flex-col justify-between group"
                                         style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="h-[3px] w-full transition-colors duration-200" style={{ backgroundColor: '#0B1340' }} />
                                        
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex gap-4 items-center mb-5">
                                                <div className="w-12 h-12 rounded-full flex shrink-0 items-center justify-center bg-white overflow-hidden" style={{ border: '1px solid #E8EAF6' }}>
                                                    <UniversityLogo src={uni.logo} alt={uni.institutionName} size="sm" websiteUrl={uni.website} />
                                                </div>
                                                <div>
                                                    <h3 className="leading-tight mb-0.5" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 18, color: '#0B1340' }}>
                                                        {uni.institutionName}
                                                    </h3>
                                                    <div className="flex items-center gap-1" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#888888' }}>
                                                        <MapPin className="h-3 w-3" />
                                                        {uni.city}, {uni.country}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-6">
                                                <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E8EAF6', color: '#0B1340', fontFamily: 'var(--font-jakarta)', fontSize: 11 }}>
                                                    {uni.programs?.length ?? 0} Programs
                                                </span>
                                            </div>

                                            <div className="mt-auto" />

                                            <Link href={`/universities/${uni.id}`} className="w-full block">
                                                <button className="w-full py-2.5 rounded-lg text-xs font-semibold hover-lift"
                                                    style={{ border: '1px solid #0B1340', color: '#0B1340', transition: 'all 0.2s ease', backgroundColor: 'transparent' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0B1340'; e.currentTarget.style.color = '#fff' }}
                                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#0B1340' }}>
                                                    View Details
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ── Group Sessions tab ── */}
                <TabsContent value="group-sessions" className="space-y-6">

                    {/* My Sessions — confirmed + waitlisted */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            My Sessions
                            {groupSessions.length > 0 && (
                                <Badge variant="secondary">{groupSessions.length}</Badge>
                            )}
                        </h3>
                        <GroupSessionList seats={groupSessions} />
                    </div>

                    {/* Discover — matching sessions not yet joined */}
                    {discoverableSessions.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-1
                                flex items-center gap-2">
                                Discover Sessions
                                <Badge variant="outline" className="text-xs font-normal">
                                    Matched to your interests
                                </Badge>
                            </h3>
                            <p className="text-xs text-muted-foreground mb-3">
                                Universities hosting sessions that match your profile
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {discoverableSessions.map(session => (
                                    <DiscoverSessionCard
                                        key={session.id}
                                        session={session}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                </TabsContent>

                <TabsContent value="advisory">
                    {advisoryStatus?.status === 'SCHEDULED' ? (
                        /* ── SESSION CONFIRMED VIEW ── */
                        <div className="max-w-2xl mx-auto py-12">
                            <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 overflow-hidden">
                                <div className="bg-green-50 px-8 py-5 border-b border-green-200 flex items-center gap-3">
                                    <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                                    <div>
                                        <p className="font-bold text-green-800">Session Confirmed!</p>
                                        <p className="text-sm text-green-600">Your advisory session has been scheduled.</p>
                                    </div>
                                </div>

                                <div className="p-8 space-y-6">
                                    {/* Confirmed Date/Time */}
                                    {advisoryStatus.scheduledAt && (
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                                                <Clock className="h-6 w-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Confirmed Date &amp; Time</p>
                                                <p className="text-lg font-bold text-indigo-900">
                                                    {new Date(advisoryStatus.scheduledAt).toLocaleString('en-IN', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: true,
                                                        timeZone: 'Asia/Kolkata'
                                                    })} IST
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Join Button */}
                                    {advisoryStatus.sessionLink && (
                                        <a
                                            href={advisoryStatus.sessionLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-base"
                                        >
                                            <ExternalLink className="h-5 w-5" />
                                            Join Session
                                        </a>
                                    )}

                                    {/* Request summary */}
                                    <div className="bg-gray-50 p-5 rounded-xl text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Target</span>
                                            <span className="font-medium">{advisoryStatus.targetDegree} in {advisoryStatus.fieldOfInterest} · {advisoryStatus.targetCountry}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Requested on</span>
                                            <span className="font-medium">{new Date(advisoryStatus.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-400 text-center">
                                        Need to reschedule? Email&nbsp;
                                        <a href="mailto:support@iaesgujarat.org" className="text-primary hover:underline">support@iaesgujarat.org</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : advisoryStatus ? (
                        /* ── PENDING / ASSIGNED / COMPLETED VIEW ── */
                        <div className="max-w-3xl mx-auto py-12">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Guided Pathway Session Requested</h2>
                                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                                    Your request has been received. Our certified IAES advisers are reviewing your profile and will contact you via email at <strong>{student.user.email}</strong> to schedule your session.
                                </p>

                                <div className="bg-gray-50 p-6 rounded-xl text-left max-w-lg mx-auto mb-8">
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                                        <span className="text-sm text-gray-500">Status</span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
                                            {advisoryStatus.status}
                                        </span>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Request Date</span>
                                            <span className="font-medium">{new Date(advisoryStatus.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Target Country</span>
                                            <span className="font-medium">{advisoryStatus.targetCountry}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Preferred Time</span>
                                            <span className="font-medium">{advisoryStatus.preferredTime}</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500">
                                    Need to make changes? Contact us at <a href="mailto:support@iaesgujarat.org" className="text-blue-600 hover:underline">support@iaesgujarat.org</a>
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* ── NO REQUEST YET ── */
                        <div className="max-w-4xl mx-auto py-8">
                            <AdvisoryForm onClose={() => setActiveTab('overview')} />
                        </div>
                    )}
                </TabsContent>

                {/* ── Alumni Bridge tab ── */}
                <TabsContent value="alumni">
                    <AlumniBridgeSection />
                </TabsContent>
            </Tabs>

            {/* ── FLOATING FIND PROGRAMS PILL ──────────────────────────────────── */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
                <Link href="/universities" className="group flex items-center gap-3 bg-gradient-to-r from-amber-400 to-amber-500 text-indigo-950 px-6 py-3 rounded-full font-bold shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.03] transition-all animate-[bounce_1s_ease-in-out_1.5s]">
                    <span className="text-xl">🎓</span>
                    Find Programs
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {matchedPrograms.length} matched
                    </span>
                </Link>
            </div>
        </div>
    )
}
