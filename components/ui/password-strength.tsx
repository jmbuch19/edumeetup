import React from 'react'

interface PasswordStrengthProps {
    password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
    const getStrength = (pass: string) => {
        let score = 0
        if (!pass) return 0
        if (pass.length > 7) score += 1
        if (pass.length > 10) score += 1
        if (/[A-Z]/.test(pass)) score += 1
        if (/[0-9]/.test(pass)) score += 1
        if (/[^A-Za-z0-9]/.test(pass)) score += 1
        return score
    }

    const score = getStrength(password)

    const getColor = (s: number) => {
        if (s < 2) return 'bg-red-500'
        if (s < 4) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getLabel = (s: number) => {
        if (s < 2) return 'Weak'
        if (s < 4) return 'Fair'
        return 'Strong'
    }

    return (
        <div className="mt-2 space-y-1">
            <div className="flex gap-1 h-1">
                <div className={`h-full flex-1 rounded-full transition-all duration-300 ${score >= 1 ? getColor(score) : 'bg-gray-200'}`} />
                <div className={`h-full flex-1 rounded-full transition-all duration-300 ${score >= 3 ? getColor(score) : 'bg-gray-200'}`} />
                <div className={`h-full flex-1 rounded-full transition-all duration-300 ${score >= 5 ? getColor(score) : 'bg-gray-200'}`} />
            </div>
            {password && (
                <p className={`text-xs text-right ${score < 2 ? 'text-red-500' : score < 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {getLabel(score)}
                </p>
            )}
        </div>
    )
}
