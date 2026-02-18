'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'


interface InteractiveCardProps extends HTMLMotionProps<"div"> {
    isActive?: boolean
    onActive?: () => void
    onInactive?: () => void
    activeClassName?: string
    inactiveClassName?: string
    children: React.ReactNode
}

export function InteractiveCard({
    isActive,
    onActive,
    onInactive,
    activeClassName = "bg-card border-primary ring-1 ring-primary/20 shadow-lg",
    inactiveClassName = "bg-card border-border hover:border-primary/50",
    className,
    children,
    ...props
}: InteractiveCardProps) {
    return (
        <motion.div
            layout
            onClick={() => {
                if (isActive) {
                    onInactive?.()
                } else {
                    onActive?.()
                }
            }}
            onHoverStart={onActive}
            onHoverEnd={onInactive}
            className={cn(
                "relative rounded-2xl border p-6 overflow-hidden cursor-pointer transition-colors duration-300",
                "flex flex-col justify-start",
                isActive ? activeClassName : inactiveClassName,
                className
            )}
            animate={{
                flex: isActive ? 3 : 1
            }}
            {...props}
        >
            {children}
        </motion.div>
    )
}
