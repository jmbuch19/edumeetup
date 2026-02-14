
import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, Calendar, Users, BookOpen } from 'lucide-react'

export default function RegistrationSuccessPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you for registering with edUmeetup</h2>
                    <p className="text-gray-600 mb-8">
                        Your university profile and program details have been received.
                    </p>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-left">
                        <p className="text-sm text-blue-800 font-medium mb-2">
                            Our team will review your submission within 24–48 hours.
                        </p>
                        <p className="text-xs text-blue-600 mb-3">
                            Once approved, you will receive login access to:
                        </p>
                        <ul className="space-y-2 text-xs text-blue-700">
                            <li className="flex items-center gap-2">
                                <BookOpen className="h-3 w-3" /> Manage your programs
                            </li>
                            <li className="flex items-center gap-2">
                                <Users className="h-3 w-3" /> View matched student leads
                            </li>
                            <li className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" /> Register for upcoming education fairs
                            </li>
                            <li className="flex items-center gap-2">
                                <Users className="h-3 w-3" /> Schedule 1:1 student meetings
                            </li>
                        </ul>
                    </div>

                    <div className="text-sm text-gray-500 mb-8">
                        <p>If you have urgent queries, contact us at:</p>
                        <a href="mailto:support@edumeetup.com" className="text-primary font-medium flex items-center justify-center gap-1 mt-1 hover:underline">
                            <Mail className="h-3 w-3" /> support@edumeetup.com
                        </a>
                    </div>

                    <p className="text-sm text-gray-400 italic mb-6">
                        We look forward to connecting your institution with future global talent.
                    </p>

                    <Link href="/">
                        <Button variant="outline" className="w-full">
                            Return to Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
