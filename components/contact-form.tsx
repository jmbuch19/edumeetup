'use client'

import { useFormState } from "react-dom"
import { ContactSubmitButton } from "@/components/contact-submit-button"
import { submitPublicInquiry } from "@/app/actions"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const initialState = {
    message: null,
    errors: null,
}

export function ContactForm() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [state, formAction] = useFormState(submitPublicInquiry as any, initialState)
    const router = useRouter()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        if (state?.success) {
            toast.success("Message sent successfully!")
            formRef.current?.reset()
            router.push('/contact/success')
        } else if (state?.error) {
            // Handle object errors (validation) or string errors
            const errorMessage = typeof state.error === 'string'
                ? state.error
                : "Please check the form for errors."

            toast.error(errorMessage)
        }
    }, [state, router])

    return (
        <form ref={formRef} action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
                    <input name="fullName" id="fullName" required className="w-full p-2 border rounded-md" placeholder="John Doe" />
                    {state?.errors?.fullName && <p className="text-red-500 text-xs">{state.errors.fullName}</p>}
                </div>
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
                    <input name="email" id="email" type="email" required className="w-full p-2 border rounded-md" placeholder="john@example.com" />
                    {state?.errors?.email && <p className="text-red-500 text-xs">{state.errors.email}</p>}
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
                {state?.errors?.message && <p className="text-red-500 text-xs">{state.errors.message}</p>}
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

            {state?.error && typeof state.error === 'string' && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                    {state.error}
                </div>
            )}

            <ContactSubmitButton />
        </form>
    )
}
