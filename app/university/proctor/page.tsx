import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ProctorTab } from '@/components/university/proctor-tab'

export default async function UniversityProctorPage() {
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const university = await prisma.university.findUnique({
        where: { userId: session.user.id },
        select: { id: true, institutionName: true },
    })
    if (!university) redirect('/university/register')

    const requests = await prisma.proctorRequest.findMany({
        where: { universityId: university.id },
        orderBy: { createdAt: 'desc' },
    })

    // Dates → ISO strings for client component serialisation
    const serialised = requests.map(r => ({
        ...r,
        fees: undefined,          // not shown to university
        reminderSentAt: undefined, // internal only
        examStartDate: r.examStartDate.toISOString(),
        examEndDate: r.examEndDate.toISOString(),
        confirmedAt: r.confirmedAt?.toISOString() ?? null,
        completedAt: undefined,
        createdAt: r.createdAt.toISOString(),
        updatedAt: undefined,
    }))

    return (
        <div className="max-w-3xl mx-auto py-4 md:py-8 px-4">
            <ProctorTab
                universityId={university.id}
                universityName={university.institutionName}
                requests={serialised as any}
            />
        </div>
    )
}
