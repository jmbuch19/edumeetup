import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAvailabilityProfiles } from "./actions"
import AvailabilityForm from "@/components/university/AvailabilityForm"

export default async function UniversityAvailabilityPage() {
    const session = await auth()

    if (!session || !session.user) {
        redirect('/login')
    }

    if (session.user.role !== 'UNIVERSITY') {
        redirect('/students/dashboard')
    }

    const profiles = await getAvailabilityProfiles()

    return (
        <div className="container mx-auto py-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Availability Settings</h1>
                    <p className="text-slate-600 mt-2">
                        Set your weekly schedule and meeting preferences. Students will only see slots based on these rules.
                    </p>
                </div>

                <AvailabilityForm initialProfiles={profiles} />
            </div>
        </div>
    )
}
