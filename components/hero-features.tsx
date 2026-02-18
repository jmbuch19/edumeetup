'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Coins, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InteractiveCard } from '@/components/ui/interactive-card'

const features = [
    {
        id: 'verified',
        title: 'Verified',
        icon: ShieldCheck,
        description: 'Every university on our platform is properly accredited and verified manually by our team.',
        color: 'bg-blue-100/50',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-600'
    },
    {
        id: 'free',
        title: 'Free',
        icon: Coins,
        description: 'No hidden costs for students. Apply to as many programs as you like, completely free of charge.',
        color: 'bg-green-100/50',
        iconColor: 'text-green-600',
        borderColor: 'border-green-600'
    },
    {
        id: 'direct',
        title: 'Direct',
        icon: Users,
        description: 'Connect directly with admissions teams. No middlemen, no agents, just pure connection.',
        color: 'bg-purple-100/50',
        iconColor: 'text-purple-600',
        borderColor: 'border-purple-600'
    }
]

export function HeroFeatures() {
    const [activeId, setActiveId] = useState<string | null>(null)

    return (
        <div className="container mx-auto px-4 w-full">
            <div className="flex flex-col md:flex-row gap-4 h-auto md:h-64 mb-16">
                {features.map((feature) => {
                    const isActive = activeId === feature.id

                    return (
                        <InteractiveCard
                            key={feature.id}
                            isActive={isActive}
                            onActive={() => setActiveId(feature.id)}
                            onInactive={() => setActiveId(null)}
                            // Override default border/shadow with feature-specific colors when active
                            activeClassName={cn("bg-white shadow-lg", feature.borderColor)}
                            className="h-auto md:h-full"
                        >
                            <motion.div layout="position" className="flex items-center gap-4 mb-4">
                                <div className={cn("p-3 rounded-xl", feature.color)}>
                                    <feature.icon className={cn("w-6 h-6", feature.iconColor)} />
                                </div>
                                <motion.h3
                                    layout="position"
                                    className={cn(
                                        "text-lg font-bold",
                                        isActive ? "text-slate-900" : "text-slate-700"
                                    )}
                                >
                                    {feature.title}
                                </motion.h3>
                            </motion.div>

                            <AnimatePresence mode="popLayout">
                                {isActive && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="text-slate-600 leading-relaxed overflow-hidden"
                                    >
                                        <p>{feature.description}</p>

                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Hint for mobile if needed */}
                            {!isActive && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="md:hidden text-sm text-slate-400 mt-2"
                                >
                                    Tap to learn more
                                </motion.div>
                            )}
                        </InteractiveCard>
                    )
                })}
            </div>
        </div>
    )
}
