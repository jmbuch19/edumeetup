import { HostFairRequestForm } from "@/components/host-fair/request-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HostFairRequestPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="container mx-auto max-w-4xl">
                <div className="mb-8">
                    <Link href="/host-a-fair">
                        <Button variant="ghost" className="pl-0 hover:pl-0 hover:bg-transparent text-slate-500 hover:text-primary mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Overview
                        </Button>
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Host a Campus Fair</h1>
                    <p className="text-slate-600 text-lg">
                        Submit your requirements and let us bring world-class universities to your campus.
                    </p>
                </div>

                <HostFairRequestForm />
            </div>
        </div>
    )
}
