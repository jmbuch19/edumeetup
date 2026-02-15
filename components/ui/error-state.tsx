import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

interface ErrorStateProps {
    title?: string
    message?: string
    onRetry?: () => void
    retryLabel?: string
}

export function ErrorState({
    title = "Something went wrong",
    message = "We encountered an unexpected error. Please try again.",
    onRetry,
    retryLabel = "Try again"
}: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-red-100 bg-red-50/50">
            <div className="bg-red-100 p-3 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6 max-w-sm">{message}</p>
            <div className="flex gap-4">
                {onRetry && (
                    <Button onClick={onRetry} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                        {retryLabel}
                    </Button>
                )}
                <Link href="/contact">
                    <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                        Contact Support
                    </Button>
                </Link>
            </div>
        </div>
    )
}
