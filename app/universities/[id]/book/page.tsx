import { redirect } from 'next/navigation'

export default async function BookingPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    // Keep the legacy public URL, but route students into the production
    // slot-based booking flow. The old booking wizard used timestamp strings
    // and imported stub actions from app/actions.ts; the canonical flow uses
    // authenticated student booking, AvailabilitySlot IDs, and atomic slot
    // locking.
    redirect(`/student/book/${id}`)
}