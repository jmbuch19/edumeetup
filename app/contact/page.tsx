
import { ContactForm } from "@/components/contact-form"
import { PdoRequestForm } from "@/components/pdo-request-form"

export default function ContactPage() {

    return (
        <div className="container mx-auto py-12 px-4 max-w-3xl">
            <div className="space-y-12">
                {/* General Contact */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
                        <p className="text-gray-500 mt-2">
                            Have a question? We&apos;re here to help. Fill out the form below and we&apos;ll get back to you shortly.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-xl border shadow-sm">
                        <ContactForm />
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">or</span>
                    <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* PDO Registration */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">✈️</span>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Organize your PDO at Ahmedabad Office
                            </h2>
                        </div>
                        <p className="text-gray-500 leading-relaxed">
                            Have you received your US university admission and student visa? Register below to attend a{" "}
                            <strong>Pre-Departure Orientation (PDO)</strong> session at the EdUmeetup Ahmedabad office.
                            Our experts will guide you through everything — banking, housing, campus life, and more —
                            before you fly for <strong>Fall or Spring</strong> semester.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-xl border shadow-sm">
                        <PdoRequestForm />
                    </div>
                </div>
            </div>
        </div>
    )
}
