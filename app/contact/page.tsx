
import { ContactSubmitButton } from "@/components/contact-submit-button"
import { submitPublicInquiry } from "@/app/actions"
import { redirect } from "next/navigation"

export default function ContactPage() {
    async function action(formData: FormData) {
        "use server"
        const result = await submitPublicInquiry(formData)
        if (result?.error) {
            // In a real app, we'd handle error state better (e.g., toast)
            console.error(result.error)
            return
        }
        redirect('/contact/success')
    }

    return (
        <div className="container mx-auto py-12 px-4 max-w-2xl">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
                    <p className="text-gray-500 mt-2">
                        Have a question? We&apos;re here to help. Fill out the form below and we&apos;ll get back to you shortly.
                    </p>
                </div>

                <div className="bg-white p-8 rounded-xl border shadow-sm">
                    <form action={action} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="fullName" className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
                                <input name="fullName" id="fullName" required className="w-full p-2 border rounded-md" placeholder="John Doe" />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
                                <input name="email" id="email" type="email" required className="w-full p-2 border rounded-md" placeholder="john@example.com" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="role" className="text-sm font-medium">I am a... <span className="text-red-500">*</span></label>
                                <select name="role" id="role" required className="w-full p-2 border rounded-md">
                                    <option value="">Select Role</option>
                                    <option value="Student">Student</option>
                                    <option value="University">University Representative</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Counselor">Counselor</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="country" className="text-sm font-medium">Country <span className="text-red-500">*</span></label>
                                <select name="country" id="country" required className="w-full p-2 border rounded-md">
                                    <option value="">Select Country</option>
                                    <option value="USA">USA</option>
                                    <option value="UK">UK</option>
                                    <option value="Canada">Canada</option>
                                    <option value="India">India</option>
                                    <option value="Australia">Australia</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="subject" className="text-sm font-medium">Subject <span className="text-red-500">*</span></label>
                            <select name="subject" id="subject" required className="w-full p-2 border rounded-md">
                                <option value="General Inquiry">General Inquiry</option>
                                <option value="Partnership">Partnership</option>
                                <option value="Event">Event</option>
                                <option value="Pricing">Pricing</option>
                                <option value="Technical">Technical Support</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="message" className="text-sm font-medium">Message <span className="text-red-500">*</span></label>
                            <textarea name="message" id="message" required rows={5} className="w-full p-2 border rounded-md" placeholder="How can we help you?" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium">Phone (Optional)</label>
                                <input name="phone" id="phone" className="w-full p-2 border rounded-md" placeholder="+1 234 567 8900" />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="orgName" className="text-sm font-medium">Organization (Optional)</label>
                                <input name="orgName" id="orgName" className="w-full p-2 border rounded-md" placeholder="University or Company Name" />
                            </div>
                        </div>

                        <ContactSubmitButton />
                    </form>
                </div>
            </div>
        </div>
    )
}
