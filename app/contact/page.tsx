
import { ContactForm } from "@/components/contact-form"

export default function ContactPage() {

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
                    <ContactForm />
                </div>
            </div>
        </div>
    )
}
