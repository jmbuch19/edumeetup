'use client'

import { Button } from "@/components/ui/button"
import { Loader2, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    state?: "idle" | "loading" | "success" | "error"
    idleLabel?: string
    loadingLabel?: string
    successLabel?: string
    errorLabel?: string
    fullWidth?: boolean
    isLoading?: boolean // Backwards compatibility if needed, but 'state' is preferred
}

export function SubmitButton({
    state = "idle",
    isLoading, // mapping old prop to new state if necessary
    idleLabel = "Submit",
    loadingLabel = "Loading...",
    successLabel = "Success!",
    errorLabel = "Error",
    fullWidth = true,
    className,
    disabled,
    ...props
}: SubmitButtonProps) {
    // Compatibility layer
    const currentState = isLoading ? "loading" : state

    const getVariant = () => {
        switch (currentState) {
            case "success": return "bg-green-600 hover:bg-green-700 text-white"
            case "error": return "bg-red-600 hover:bg-red-700 text-white"
            case "loading": return "bg-indigo-600/80 text-white cursor-not-allowed"
            default: return "bg-indigo-600 hover:bg-indigo-700 text-white"
        }
    }

    return (
        <Button
            className={cn(
                "transition-all duration-200",
                fullWidth && "w-full",
                getVariant(),
                className
            )}
            disabled={currentState === "loading" || currentState === "success" || disabled}
            aria-busy={currentState === "loading"}
            aria-live="polite"
            {...props}
        >
            {currentState === "loading" ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingLabel}
                </>
            ) : currentState === "success" ? (
                <>
                    <Check className="mr-2 h-4 w-4" />
                    {successLabel}
                </>
            ) : currentState === "error" ? (
                <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {errorLabel}
                </>
            ) : (
                idleLabel
            )}
        </Button>
    )
}
