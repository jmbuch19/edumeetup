import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight } from 'lucide-react'

export default function StudentRegisterSuccessPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to clean-code!</h2>
                    <p className="text-gray-600 mb-6">
                        Your student account has been successfully created. You can now explore universities and find your perfect match.
                    </p>

                    <div className="space-y-3">
                        <Link href="/student/dashboard">
                            <Button className="w-full">
                                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/universities">
                            <Button variant="outline" className="w-full">
                                Browse Universities
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
