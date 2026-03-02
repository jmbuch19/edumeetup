import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ProctorRequestUI } from './ProctorRequestUI'

export default async function UniversityProctorPage() {
    const session = await auth()
    if (!session?.user?.id) redirect('/login')

    const university = await prisma.university.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!university) redirect('/university/register')

    const requests = await prisma.proctorRequest.findMany({
        where: { universityId: university.id },
        orderBy: { createdAt: 'desc' },
    })

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 px-4">
            <ProctorRequestUI initial={requests as any} />
        </div>
    )
}
