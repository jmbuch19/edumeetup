import React from 'react'
import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { UniAlumniTab } from '@/components/university/UniAlumniTab'
import { AlumniInvitePanel } from '@/components/university/AlumniInvitePanel'

export const dynamic = 'force-dynamic'

export default async function UniversityAlumniPage() {
    const user = await requireUser()
    if (user.role !== 'UNIVERSITY' && user.role !== 'UNIVERSITY_REP') {
        redirect('/login')
    }

    const uni = await prisma.university.findFirst({
        where: { user: { email: user.email! } }
    })
    if (!uni) redirect('/login')

    const [totalAlumni, openToMentor, connectRequests, invitationList] = await Promise.all([
        prisma.alumni.count({
            where: {
                isVerified: true,
                adminReviewStatus: { not: 'SUSPENDED' },
                OR: [
                    { usUniversityId: uni.id },
                    { usUniversityName: { contains: uni.institutionName, mode: 'insensitive' } }
                ]
            }
        }),
        prisma.alumni.count({
            where: {
                isVerified: true,
                adminReviewStatus: { not: 'SUSPENDED' },
                OR: [
                    { usUniversityId: uni.id },
                    { usUniversityName: { contains: uni.institutionName, mode: 'insensitive' } }
                ],
                availableFor: { isEmpty: false }
            }
        }),
        prisma.alumConnectRequest.count({
            where: {
                alumni: {
                    OR: [
                        { usUniversityId: uni.id },
                        { usUniversityName: { contains: uni.institutionName, mode: 'insensitive' } }
                    ]
                }
            }
        }),
        prisma.alumniInvitation.findMany({
            where: { universityId: uni.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true, email: true, status: true, createdAt: true, expiresAt: true }
        })
    ])

    const invitesSent = invitationList.length;

    return (
        <div className="space-y-8 max-w-full px-4 md:px-6 py-6">
            {/* Header Section */}
            <div className="bg-indigo-gradient rounded-2xl px-8 py-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <GraduationCap 
                        className="animate-float shrink-0" 
                        size={32} 
                        style={{ color: '#C9A84C' }} 
                    />
                    <div>
                        <h1 
                            className="text-[32px] font-black text-white leading-tight"
                            style={{ fontFamily: 'var(--font-fraunces)' }}
                        >
                            Alumni Hub
                        </h1>
                        <p 
                            className="text-sm mt-1"
                            style={{ 
                                color: '#C9A84C',
                                fontFamily: 'var(--font-jakarta)'
                            }}
                        >
                            Indian Students who attended your university and want to help the next generation
                        </p>
                    </div>
                </div>
                
                <div className="shrink-0">
                    <Button 
                        onClick={() => document.getElementById('invite-alumni')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-[#C9A84C] text-[#0B1340] hover:bg-amber-400 font-bold px-6 py-6 shadow-md transition-all hover:-translate-y-1"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                    >
                        Invite Alumni
                    </Button>
                </div>
            </div>

            {/* Section A: Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Card 1: Total Alumni */}
                <div 
                    className="glass-card rounded-2xl p-5 text-center animate-pop" 
                    style={{ animationDelay: '0ms' }}
                >
                    <div 
                        className="text-[40px] font-black text-[#0B1340] leading-none mb-1"
                        style={{ fontFamily: 'var(--font-fraunces)' }}
                    >
                        {totalAlumni}
                    </div>
                    <div 
                        className="text-[13px] text-[#888888]"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                    >
                        Total Alumni
                    </div>
                </div>

                {/* Card 2: Open to Mentor */}
                <div 
                    className="glass-card rounded-2xl p-5 text-center animate-pop" 
                    style={{ animationDelay: '100ms' }}
                >
                    <div 
                        className="text-[40px] font-black text-[#C9A84C] leading-none mb-1"
                        style={{ fontFamily: 'var(--font-fraunces)' }}
                    >
                        {openToMentor}
                    </div>
                    <div 
                        className="text-[13px] text-[#888888]"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                    >
                        Open to Mentor
                    </div>
                </div>

                {/* Card 3: Connect Requests */}
                <div 
                    className="glass-card rounded-2xl p-5 text-center animate-pop" 
                    style={{ animationDelay: '200ms' }}
                >
                    <div 
                        className="text-[40px] font-black text-[#0B1340] leading-none mb-1"
                        style={{ fontFamily: 'var(--font-fraunces)' }}
                    >
                        {connectRequests}
                    </div>
                    <div 
                        className="text-[13px] text-[#888888]"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                    >
                        Connect Requests
                    </div>
                </div>

                {/* Card 4: Invites Sent */}
                <div 
                    className="glass-card rounded-2xl p-5 text-center animate-pop" 
                    style={{ animationDelay: '300ms' }}
                >
                    <div 
                        className="text-[40px] font-black text-[#0B1340] leading-none mb-1"
                        style={{ fontFamily: 'var(--font-fraunces)' }}
                    >
                        {invitesSent}
                    </div>
                    <div 
                        className="text-[13px] text-[#888888]"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                    >
                        Invites Sent
                    </div>
                </div>
            </div>

            {/* Section B: Alumni List (Full Width) */}
            <div className="w-full">
                <UniAlumniTab 
                    universityId={uni.id} 
                    universityName={uni.institutionName} 
                />
            </div>

            {/* Section C: Invite Alumni Panel */}
            <AlumniInvitePanel initialInvites={invitationList} />
        </div>
    )
}
