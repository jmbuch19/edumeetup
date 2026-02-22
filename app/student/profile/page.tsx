import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from '@/components/student/profile-form'
import { CvUpload } from '@/components/student/cv-upload'
import { FIELD_CATEGORIES } from '@/lib/constants'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StudentProfilePage() {
    const user = await requireUser()

    if (user.role !== 'STUDENT') {
        redirect('/')
    }

    const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: { _count: { select: { changeLogs: true } } }
    })

    if (!student) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 p-4 rounded-md text-red-600">
                    Profile not found. Please contact support.
                </div>
            </div>
        )
    }

    const fieldCategories = [...FIELD_CATEGORIES]

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-muted-foreground mb-8 text-sm">
                You control your profile. Update any field at any time — universities and advisors always see your latest version.
            </p>
            <div className="max-w-3xl mx-auto space-y-6">
                <ProfileForm
                    initialData={{
                        ...student,
                        fullName: student.fullName ?? user.name ?? null,
                        phoneNumber: student.phone
                    }}
                    fieldCategories={fieldCategories}
                    logCount={student._count.changeLogs}
                />
                <CvUpload
                    studentId={student.id}
                    initialFileName={student.cvFileName}
                    initialUploadedAt={student.cvUploadedAt}
                    initialSizeBytes={student.cvSizeBytes}
                />
            </div>
        </div>
    )
}

