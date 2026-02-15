import { Button } from "@/components/ui/button"
import { createSupportTicket } from "@/app/actions"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"

export default async function SupportPage() {
    // 1. Check Session
    const user = await getSession()

    if (!user) {
        redirect('/login?next=/support')
    }

    if (!user) redirect('/login')

    const userName = user.studentProfile?.fullName || user.universityProfile?.institutionName || "User"
    const userRole = user.role

    async function action(formData: FormData) {
        "use server"
        const result = await createSupportTicket(formData)
        if (result?.error) {
            console.error(result.error)
            return
        }
        redirect('/support/tickets')
    }

    return (
        <div className="container mx-auto py-12 px-4 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Member Support</h1>
                    <p className="text-gray-500">
                        Need help with your account or the platform?
                    </p>
                </div>
                <Link href="/support/tickets">
                    <Button variant="outline">View My Tickets</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h2 className="text-xl font-semibold mb-4">Submit a Ticket</h2>
                        <form action={action} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
                                    <p className="font-medium text-gray-900">{userName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                                    <p className="font-medium text-gray-900">{user.email}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Account Type</label>
                                    <p className="font-medium text-gray-900">{userRole}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="category" className="text-sm font-medium">Category <span className="text-red-500">*</span></label>
                                    <select name="category" id="category" required className="w-full p-2 border rounded-md">
                                        <option value="">Select Issue Type</option>
                                        <option value="Login Issue">Login Issue</option>
                                        <option value="Profile">Profile</option>
                                        <option value="Programs">Programs</option>
                                        <option value="Matching">Matching</option>
                                        <option value="Event Registration">Event Registration</option>
                                        <option value="Billing">Billing</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="priority" className="text-sm font-medium">Priority <span className="text-red-500">*</span></label>
                                    <select name="priority" id="priority" required className="w-full p-2 border rounded-md">
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium">Message <span className="text-red-500">*</span></label>
                                <textarea name="message" id="message" required rows={5} className="w-full p-2 border rounded-md" placeholder="Describe your issue..." />
                            </div>

                            <Button type="submit" className="w-full">Create Ticket</Button>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h3 className="font-semibold text-blue-900 mb-2">Support Hours</h3>
                        <p className="text-sm text-blue-800">
                            Our team is available Monday to Friday, 9:00 AM - 5:00 PM EST.
                        </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">FAQ</h3>
                        <ul className="text-sm space-y-2 text-gray-600 list-disc list-inside">
                            <li>How to reset my password?</li>
                            <li>How to verify my university?</li>
                            <li>How to update my profile?</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
