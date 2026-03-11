import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from '@/components/student/profile-form'
import { CvUpload } from '@/components/student/cv-upload'
import { FIELD_CATEGORIES } from '@/lib/constants'
import { redirect } from 'next/navigation'
import ManageMyDataSection from '@/components/my-data/ManageMyDataSection'
import { SocialProofBubble } from '@/components/student/SocialProofBubble'

export const dynamic = 'force-dynamic'

export default async function StudentProfilePage() {
    const user = await requireUser()

    if (user.role !== 'STUDENT') {
        redirect('/')
    }

    const [student, userData] = await Promise.all([
        prisma.student.findFirst({
            where: { userId: user.id },
            include: { _count: { select: { changeLogs: true } } }
        }),
        prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true, email: true, name: true, role: true, createdAt: true,
                consentMarketing: true, consentAnalytics: true, consentWithdrawnAt: true,
                deletionRequestedAt: true, deletionScheduledFor: true,
                consentHistory: {
                    orderBy: { changedAt: 'desc' },
                    select: { field: true, oldValue: true, newValue: true, changedAt: true }
                },
            }
        })
    ])

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

    const profileFormNode = (
        <div className="space-y-6">
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
                initialCvUrl={student.cvUrl}
                initialFileName={student.cvFileName}
                initialUploadedAt={student.cvUploadedAt}
                initialSizeBytes={student.cvSizeBytes}
            />
        </div>
    )

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page heading */}
            <div className="mb-8">
                <h1
                    style={{ color: 'oklch(37.9% 0.146 265.522)' }}
                    className="text-3xl font-bold tracking-tight"
                >
                    My Profile
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    You control your profile. Update any field at any time —&nbsp;
                    universities and advisors always see your latest version.
                </p>
            </div>
            <div className="max-w-3xl mx-auto space-y-10">
                {/* Quick access profile forms */}
                <div className="space-y-6">
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
                        initialCvUrl={student.cvUrl}
                        initialFileName={student.cvFileName}
                        initialUploadedAt={student.cvUploadedAt}
                        initialSizeBytes={student.cvSizeBytes}
                    />
                </div>

                {/* GDPR: Manage My Data */}
                {userData && (
                    <ManageMyDataSection
                        user={{
                            ...userData,
                            role: userData.role as string,
                        }}
                        consentHistory={userData.consentHistory}
                        profileComponent={profileFormNode}
                        supportEmail={process.env.SUPPORT_EMAIL}
                    />
                )}
            </div>

            {/* Floating social-proof bubble — real-time student count */}
            <SocialProofBubble />
        </div>
    )
}

