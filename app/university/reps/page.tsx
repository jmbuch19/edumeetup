import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUniversityReps } from './actions'
import AddRepForm from './AddRepForm'
import RepList from './RepList'

export default async function RepsPage() {
    const session = await auth()
    if (!session || !session.user || ((session.user as any).role !== 'UNIVERSITY' && (session.user as any).role !== 'UNIVERSITY_REP')) {
        redirect('/login')
    }

    const reps = await getUniversityReps()

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Representative Management</h1>
                <AddRepForm />
            </div>

            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b bg-gray-50 flex font-medium text-sm text-gray-500">
                    <div className="flex-1">Email</div>
                    <div className="w-32 text-center">Status</div>
                    <div className="w-32 text-center">Joined</div>
                    <div className="w-24">Actions</div>
                </div>
                <RepList reps={reps} />
            </div>
        </div>
    )
}
