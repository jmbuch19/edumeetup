
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mail } from "lucide-react"

export default function VerifyRequestPage() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="mx-auto bg-indigo-100 p-3 rounded-full w-fit">
                    <Mail className="h-8 w-8 text-indigo-600" />
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Check your email</h2>

                <p className="text-gray-600">
                    A sign in link has been sent to your email address.
                </p>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                    <p>Click the link in the email to sign in.</p>
                    <p className="mt-2 text-xs opacity-75">The link is valid for 15 minutes.</p>
                </div>

                <div className="mt-6">
                    <Link href="/login">
                        <Button variant="outline" className="w-full">
                            Back to Login
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
