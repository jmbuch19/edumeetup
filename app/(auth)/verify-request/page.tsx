import Link from "next/link"
import { Mail, ArrowLeft } from "lucide-react"

export default function VerifyRequestPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-indigo-600" />
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Check your inbox</h2>
                    <p className="mt-2 text-gray-500">
                        A sign-in link has been sent to your email address.
                    </p>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg text-left text-sm text-amber-800 border border-amber-100">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Link expires in 15 minutes</li>
                        <li>Single use only</li>
                        <li>Check your spam folder if not visible</li>
                    </ul>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <Link
                        href="/login"
                        className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
