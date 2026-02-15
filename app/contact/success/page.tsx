import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function ContactSuccessPage() {
    return (
        <div className="container mx-auto py-20 px-4 text-center">
            <div className="max-w-md mx-auto space-y-6">
                <div className="flex justify-center">
                    <CheckCircle className="h-24 w-24 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Message Sent!</h1>
                <p className="text-gray-500 text-lg">
                    Thank you for reaching out to EduMeetup. We have received your inquiry and typically respond within 24-48 hours.
                </p>
                <div className="pt-6">
                    <Link href="/">
                        <Button variant="outline">Return Home</Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
