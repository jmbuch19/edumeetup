import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import BookingWizard from '@/components/meeting/BookingWizard'
import Link from 'next/link'

export default async function BookingPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const university = await prisma.university.findUnique({
        where: { id }
    })

    if (!university) notFound()

    return (
        <div className="container mx-auto px-4 py-8">
            <Link href={`/universities/${id}`} className="text-sm text-gray-500 hover:underline mb-6 inline-block">
                &larr; Back to Profile
            </Link>

            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold mb-2">Book a Meeting</h1>
                    <p className="text-gray-500">Schedule a 1-on-1 session with {university.institutionName}</p>
                </div>

                <BookingWizard universityId={university.id} universityName={university.institutionName} />
            </div>
        </div>
    )
}
