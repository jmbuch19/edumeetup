
'use client'

import { registerStudent } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

export default function StudentRegisterPage() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="w-full max-w-3xl space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-primary p-2 rounded-lg mb-4">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        Create Student Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Complete your profile to find your perfect university match
                    </p>
                </div>

                <form className="mt-8 space-y-8" action={registerStudent}>
                    {/* Section A: Basic Profile */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Section A — Basic Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <Input name="fullName" type="text" required placeholder="John Doe" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <Input name="email" type="email" required placeholder="john@example.com" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <Input name="password" type="password" required placeholder="••••••••" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country of Residence</label>
                                <select name="country" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Country</option>
                                    <option value="India">India</option>
                                    <option value="China">China</option>
                                    <option value="Nigeria">Nigeria</option>
                                    <option value="Vietnam">Vietnam</option>
                                    <option value="Brazil">Brazil</option>
                                    <option value="USA">USA</option>
                                    <option value="UK">UK</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Education Level</label>
                                <select name="currentStatus" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Status</option>
                                    <option value="Grade 12">12th Grade</option>
                                    <option value="Bachelor Final Year">Bachelor’s Final Year</option>
                                    <option value="Bachelor Completed">Bachelor’s Completed</option>
                                    <option value="Master Completed">Master’s Completed</option>
                                    <option value="Working Professional">Working Professional</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section B: Study Preference */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Section B — Study Preference</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Desired Degree Level</label>
                                <select name="preferredDegree" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Degree</option>
                                    <option value="Bachelor's">Bachelor’s</option>
                                    <option value="Master's">Master’s</option>
                                    <option value="MBA">MBA</option>
                                    <option value="PhD">PhD</option>
                                    <option value="Certificate">Certificate</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Field of Interest</label>
                                <select name="fieldOfInterest" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Field</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Business">Business</option>
                                    <option value="Data Science">Data Science</option>
                                    <option value="Health Sciences">Health Sciences</option>
                                    <option value="Social Sciences">Social Sciences</option>
                                    <option value="Arts & Humanities">Arts & Humanities</option>
                                    <option value="Law">Law</option>
                                    <option value="Architecture">Architecture</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range (USD)</label>
                                <select name="budgetRange" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Budget</option>
                                    <option value="< 15,000">&lt; 15,000</option>
                                    <option value="15,000–25,000">15,000–25,000</option>
                                    <option value="25,000–40,000">25,000–40,000</option>
                                    <option value="40,000+">40,000+</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Intake</label>
                                <select name="preferredIntake" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Intake</option>
                                    <option value="Fall">Fall</option>
                                    <option value="Spring">Spring</option>
                                    <option value="Summer">Summer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">English Test Type</label>
                                <select name="englishTestType" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="Not Taken Yet">Not Taken Yet</option>
                                    <option value="IELTS">IELTS</option>
                                    <option value="TOEFL">TOEFL</option>
                                    <option value="Duolingo">Duolingo</option>
                                    <option value="PTE">PTE</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">English Score (If taken)</label>
                                <Input name="englishScore" type="number" step="0.5" placeholder="e.g. 7.5 or 100" />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Study Country (Optional)</label>
                                <Input name="preferredCountries" placeholder="e.g. USA, Canada, UK" />
                            </div>

                        </div>
                    </div>

                    <div className="pt-4">
                        <label className="block text-sm text-gray-500 mb-4">
                            By creating an account, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
                        </label>
                        <Button type="submit" className="w-full" size="lg">
                            Create Account
                        </Button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <span className="text-gray-500">Already have an account? </span>
                    <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
