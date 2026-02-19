import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from '@/components/student/profile-form'
import { FIELD_CATEGORIES } from '@/lib/constants'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StudentProfilePage() {
    const user = await requireUser()

    // Ensure we are a student
    if (user.role !== 'STUDENT') {
        redirect('/')
    }

    const student = await prisma.student.findFirst({
        where: { userId: user.id }
    })

    if (!student) {
        // If no profile exists, they might need to be redirected or we should create a stub.
        // For MVP, assuming registration created a stub or we redirect to a unified setup?
        // Let's redirect to dashboard which handles "Incomplete" state, or just show error.
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 p-4 rounded-md text-red-600">
                    Profile not found. Please contact support.
                </div>
            </div>
        )
    }

    // Convert Enum to array for dropdown
    const fieldCategories = [...FIELD_CATEGORIES]

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Profile</h1>
            <div className="max-w-3xl mx-auto">
                <ProfileForm
                    initialData={student}
                    fieldCategories={fieldCategories}
                />
            </div>
        </div>
    )
}
