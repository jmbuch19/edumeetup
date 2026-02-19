import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import BookingWizard from "@/components/booking/BookingWizard"
import { getBookingData } from "./actions"

export default async function StudentBookingPage({ params }: { params: { universityId: string } }) {
    const session = await auth()
    if (!session || !session.user) {
        redirect(`/login?callbackUrl=/student/book/${params.universityId}`)
    }

    const { universityId } = params
    const bookingData = await getBookingData(universityId)

    if (bookingData.error || !bookingData.university) {
        return (
            <div className="container mx-auto py-20 text-center">
                <p className="text-red-500">Failed to load booking information: {bookingData.error}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <BookingWizard
                university={bookingData.university}
                existingBookings={bookingData.existingBookings}
            />
        </div>
    )
}
