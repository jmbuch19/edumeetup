import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { StudentNav } from '@/components/student/student-nav'
import { StudentRightSidebar } from '@/components/student/student-right-sidebar'
import '@/app/dashboard-tokens.css'

import { ClientGreeting } from '@/components/client-greeting'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    if (!session || (session.user as any).role !== 'STUDENT') {
        redirect('/login')
    }

    const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { fullName: true, city: true },
    })

    const rawName = student?.fullName?.trim() || session.user.name?.trim() || 'there'
    const firstName = rawName.split(' ')[0]

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#F8F9FF] font-body relative">
            {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
            <StudentNav
                userName={student?.fullName ?? session.user.name}
                city={student?.city}
                senderEmail={session.user.email}
            />

            {/* ── Main Layout Body ────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden relative z-10">
                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="w-full max-w-[860px] mx-auto px-4 py-8">
                        {children}
                    </div>
                </main>

                {/* ── Right Sidebar ────────────────────────────────────────────────── */}
                <Suspense fallback={<aside className="hidden lg:flex w-[300px] min-w-[300px] border-l bg-white z-0" />}>
                    <StudentRightSidebar />
                </Suspense>
            </div>
        </div>
    )
}
