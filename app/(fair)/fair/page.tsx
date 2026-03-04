import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FairRegistrationForm } from './fair-form'
import { FairQAPanel, type QAItem } from '@/components/fair/fair-qa-panel'

interface PageProps {
    searchParams: { eventId?: string }
}

export const dynamic = 'force-dynamic'

export default async function FairPage({ searchParams }: PageProps) {
    const eventId = searchParams.eventId

    // ── Missing eventId ───────────────────────────────────────────────────────
    if (!eventId) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-4xl mb-4">🎓</p>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Event Not Specified</h1>
                    <p className="text-gray-500 text-sm">
                        Please scan the QR code at the fair entrance to access registration.
                    </p>
                </div>
            </main>
        )
    }

    // ── Fetch fair event ──────────────────────────────────────────────────────
    const fairEvent = await prisma.fairEvent.findUnique({
        where: { id: eventId },
        select: { id: true, name: true, slug: true, city: true, startDate: true, endDate: true, status: true },
    })

    if (!fairEvent) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-4xl mb-4">❌</p>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Event Not Found</h1>
                    <p className="text-gray-500 text-sm">
                        This fair event does not exist or may have ended. Please contact the organiser.
                    </p>
                </div>
            </main>
        )
    }

    // ── Auth — optional (fair is public) ─────────────────────────────────────
    const session = await auth()

    let prefilled: {
        fullName?: string
        email?: string
        phone?: string
        fieldOfInterest?: string
        budgetRange?: string
        preferredCountries?: string
    } = {}
    let isLoggedIn = false
    let profileComplete = false

    if (session?.user?.email) {
        isLoggedIn = true

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                student: {
                    select: {
                        fullName: true,
                        phone: true,
                        fieldOfInterest: true,
                        budgetRange: true,
                        preferredCountries: true,
                    },
                },
            },
        })

        if (user?.student) {
            prefilled = {
                fullName: user.student.fullName ?? '',
                email: user.email,
                phone: user.student.phone ?? '',
                fieldOfInterest: user.student.fieldOfInterest ?? '',
                budgetRange: user.student.budgetRange ?? '',
                preferredCountries: user.student.preferredCountries ?? '',
            }

            // STATE A: all key fields present → complete profile
            profileComplete = !!(
                user.student.fullName &&
                user.student.phone &&
                user.student.fieldOfInterest &&
                user.student.budgetRange &&
                user.student.preferredCountries
            )
        }
    }

    // ── Fetch public answered questions for this event ────────────────────────
    const rawQuestions = await prisma.fairQuestion.findMany({
        where: { fairEventId: eventId, answer: { not: null }, isPublic: true },
        orderBy: { answeredAt: 'asc' },
        select: { id: true, question: true, askerRole: true, answer: true, answeredAt: true, createdAt: true },
    })
    const publicQuestions: QAItem[] = rawQuestions.map(q => ({
        id: q.id,
        question: q.question,
        askerRole: q.askerRole,
        answer: q.answer,
        answeredAt: q.answeredAt?.toISOString() ?? null,
        createdAt: q.createdAt.toISOString(),
    }))

    return (
        <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-12 px-4">
            <div className="max-w-xl mx-auto space-y-4">
                <FairRegistrationForm
                    fairEventId={eventId}
                    fairEventTitle={fairEvent.name}
                    fairEventCity={fairEvent.city ?? ''}
                    prefilled={prefilled}
                    isLoggedIn={isLoggedIn}
                    profileComplete={profileComplete}
                    sessionEmail={session?.user?.email ?? null}
                />
                <FairQAPanel
                    fairEventId={eventId}
                    questions={publicQuestions}
                    isLoggedIn={isLoggedIn}
                />
            </div>
        </main>
    )
}
