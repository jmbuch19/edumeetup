import { getUniversityMeetings } from '@/app/actions'
import MeetingList from '@/components/university/MeetingList'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import ExportButton from './ExportButton'

export default async function UniversityMeetingsPage() {
    const session = await auth()

    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        redirect('/login')
    }

    // Fetch all meetings
    const allMeetings = await getUniversityMeetings() || []

    const pendingMeetings = allMeetings.filter(m => m.status === 'PENDING')
    const upcomingMeetings = allMeetings.filter(m => m.status === 'CONFIRMED' && new Date(m.proposedDatetime) > new Date())
    const pastMeetings = allMeetings.filter(m =>
        (m.status === 'CONFIRMED' && new Date(m.proposedDatetime) <= new Date()) ||
        m.status === 'COMPLETED' ||
        m.status === 'CANCELLED' ||
        m.status === 'REJECTED'
    )

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Meeting Requests</h1>
                    <p className="text-gray-500">Manage your student appointments</p>
                </div>
                <ExportButton />
            </div>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8">
                    <TabsTrigger value="pending" className="relative">
                        Pending
                        {pendingMeetings.length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {pendingMeetings.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past/All</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <MeetingList meetings={pendingMeetings} />
                </TabsContent>

                <TabsContent value="upcoming">
                    <MeetingList meetings={upcomingMeetings} />
                </TabsContent>

                <TabsContent value="past">
                    <MeetingList meetings={pastMeetings} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
