
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default function OnboardingPage() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="mx-auto bg-green-100 p-3 rounded-full w-fit">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome to EduMeetup!</h2>

                <p className="text-gray-600">
                    Your account has been successfully created.
                </p>

                <div className="mt-6">
                    <Link href="/student/dashboard">
                        <Button className="w-full" size="lg">
                            Go to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
