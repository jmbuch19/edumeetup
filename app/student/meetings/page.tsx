import { getStudentMeetings } from '@/app/actions'
import StudentMeetingList from '@/components/student/StudentMeetingList'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function StudentMeetingsPage() {
    const session = await auth()

    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
        redirect('/login')
    }

    const meetings = await getStudentMeetings()

    // Separate by status if needed, or just pass all to the list to filter/sort
    // Let's pass all and let the client component display them (or simple list)

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="bg-gradient-to-r from-primary to-secondary text-white pt-12 pb-24 px-4">
                <div className="container mx-auto">
                    <h1 className="text-3xl font-bold mb-2">My Meetings</h1>
                    <p className="text-blue-100 text-lg opacity-90">Manage your scheduled sessions with universities.</p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-16 pb-12">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                        <StudentMeetingList meetings={meetings} />
                    </div>
                </div>
            </div>
        </div>
    )
}
