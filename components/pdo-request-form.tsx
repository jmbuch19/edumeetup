'use client'

import { useFormState } from "react-dom"
import { ContactSubmitButton } from "@/components/contact-submit-button"
import { submitPdoRegistration } from "@/app/actions"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

interface PdoState {
    success?: boolean
    error?: string | null
    errors?: {
        fullName?: string[]
        email?: string[]
        phone?: string[]
        universityName?: string[]
        programName?: string[]
        degreeLevel?: string[]
        intakeSemester?: string[]
        visaStatus?: string[]
        city?: string[]
        questions?: string[]
    } | null
}

const initialState: PdoState = {
    success: false,
    error: null,
    errors: null,
}

export function PdoRequestForm() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [state, formAction] = useFormState(submitPdoRegistration as any, initialState)
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        if (state?.success) {
            toast.success("Registration submitted! We'll be in touch shortly. 🎓")
            formRef.current?.reset()
        } else if (state?.error) {
            toast.error(state.error)
        }
    }, [state])

    const field = (name: keyof NonNullable<PdoState['errors']>) =>
        state?.errors?.[name]

    return (
        <form ref={formRef} action={formAction} className="space-y-6">
            {/* Row 1: Name + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="pdo-fullName" className="text-sm font-medium">
                        Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="fullName"
                        id="pdo-fullName"
                        required
                        className="w-full p-2 border rounded-md"
                        placeholder="e.g. Priya Sharma"
                    />
                    {field('fullName') && <p className="text-red-500 text-xs">{field('fullName')}</p>}
                </div>
                <div className="space-y-2">
                    <label htmlFor="pdo-email" className="text-sm font-medium">
                        Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="email"
                        id="pdo-email"
                        type="email"
                        required
                        className="w-full p-2 border rounded-md"
                        placeholder="priya@gmail.com"
                    />
                    {field('email') && <p className="text-red-500 text-xs">{field('email')}</p>}
                </div>
            </div>

            {/* Row 2: Phone + City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="pdo-phone" className="text-sm font-medium">
                        Phone / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="phone"
                        id="pdo-phone"
                        required
                        className="w-full p-2 border rounded-md"
                        placeholder="+91 98765 43210"
                    />
                    {field('phone') && <p className="text-red-500 text-xs">{field('phone')}</p>}
                </div>
                <div className="space-y-2">
                    <label htmlFor="pdo-city" className="text-sm font-medium">
                        Your City (Departing From) <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="city"
                        id="pdo-city"
                        required
                        className="w-full p-2 border rounded-md"
                        placeholder="e.g. Ahmedabad, Surat, Vadodara"
                    />
                    {field('city') && <p className="text-red-500 text-xs">{field('city')}</p>}
                </div>
            </div>

            {/* Row 3: University + Program */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="pdo-universityName" className="text-sm font-medium">
                        Admitted University (US) <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="universityName"
                        id="pdo-universityName"
                        required
                        className="w-full p-2 border rounded-md"
                        placeholder="e.g. University of Illinois Urbana-Champaign"
                    />
                    {field('universityName') && <p className="text-red-500 text-xs">{field('universityName')}</p>}
                </div>
                <div className="space-y-2">
                    <label htmlFor="pdo-programName" className="text-sm font-medium">
                        Program / Course of Study <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="programName"
                        id="pdo-programName"
                        required
                        className="w-full p-2 border rounded-md"
                        placeholder="e.g. MS Computer Science"
                    />
                    {field('programName') && <p className="text-red-500 text-xs">{field('programName')}</p>}
                </div>
            </div>

            {/* Row 4: Degree + Intake */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="pdo-degreeLevel" className="text-sm font-medium">
                        Degree Level <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="degreeLevel"
                        id="pdo-degreeLevel"
                        required
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="">Select Degree Level</option>
                        <option value="Bachelor's">Bachelor&apos;s</option>
                        <option value="Master's">Master&apos;s</option>
                        <option value="PhD">PhD / Doctoral</option>
                        <option value="Other">Other</option>
                    </select>
                    {field('degreeLevel') && <p className="text-red-500 text-xs">{field('degreeLevel')}</p>}
                </div>
                <div className="space-y-2">
                    <label htmlFor="pdo-intakeSemester" className="text-sm font-medium">
                        Intake Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="intakeSemester"
                        id="pdo-intakeSemester"
                        required
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="">Select Intake</option>
                        <option value="Fall 2025">Fall 2025</option>
                        <option value="Spring 2026">Spring 2026</option>
                        <option value="Fall 2026">Fall 2026</option>
                        <option value="Spring 2027">Spring 2027</option>
                    </select>
                    {field('intakeSemester') && <p className="text-red-500 text-xs">{field('intakeSemester')}</p>}
                </div>
            </div>

            {/* Visa Status */}
            <div className="space-y-2">
                <label htmlFor="pdo-visaStatus" className="text-sm font-medium">
                    Student Visa Status <span className="text-red-500">*</span>
                </label>
                <select
                    name="visaStatus"
                    id="pdo-visaStatus"
                    required
                    className="w-full p-2 border rounded-md"
                >
                    <option value="">Select Visa Status</option>
                    <option value="Visa Received">F-1 Visa Received ✓</option>
                    <option value="Visa Interview Scheduled">Visa Interview Scheduled</option>
                    <option value="Awaiting Decision">Awaiting Visa Decision</option>
                </select>
                {field('visaStatus') && <p className="text-red-500 text-xs">{field('visaStatus')}</p>}
            </div>

            {/* Questions */}
            <div className="space-y-2">
                <label htmlFor="pdo-questions" className="text-sm font-medium">
                    Questions / Special Requirements <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                    name="questions"
                    id="pdo-questions"
                    rows={4}
                    className="w-full p-2 border rounded-md"
                    placeholder="Any questions about the PDO session, what to bring, housing, banking in the US, etc."
                />
            </div>

            {state?.error && !state?.errors && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                    {state.error}
                </div>
            )}

            <ContactSubmitButton />
        </form>
    )
}
