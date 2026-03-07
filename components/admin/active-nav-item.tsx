"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface ActiveNavItemProps {
    href: string
    iconNode: React.ReactNode
    label: string
}

export function ActiveNavItem({ href, iconNode, label }: ActiveNavItemProps) {
    const pathname = usePathname()
    const isActive = pathname === href || pathname.startsWith(href + "/")

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-primary"
            )}
        >
            {iconNode}
            {label}
            {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
            )}
        </Link>
    )
}
