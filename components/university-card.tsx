'use client'

import { useState } from 'react'
import { GraduationCap, MapPin, ShieldCheck, Edit } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { University } from '@prisma/client'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { cn } from '@/lib/utils'

// Use a type that matches what the search action returns
type UniversityWithPrograms = University & {
    programs: { fieldCategory?: unknown, programName?: unknown, degreeLevel?: unknown }[]
}

interface UniversityCardProps {
    university: UniversityWithPrograms
    userRole?: string
}

export function UniversityCard({ university, userRole }: UniversityCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const isAdmin = userRole === 'ADMIN'

    return (
        <Link href={`/universities/${university.id}`} className="block h-full">
            <InteractiveCard
                isActive={isHovered}
                onActive={() => setIsHovered(true)}
                onInactive={() => setIsHovered(false)}
                className="h-full flex flex-col"
                activeClassName="bg-card border-primary ring-1 ring-primary/20 shadow-lg"
                inactiveClassName="bg-card border-border hover:border-primary/50"
                animate={{ scale: isHovered ? 1.02 : 1 }}
            >
                <div className="h-32 bg-muted/30 flex items-center justify-center border-b border-border relative -m-6 mb-6 group-hover:bg-primary/5 transition-colors">
                    {/* Logo Placeholder */}
                    <GraduationCap className={cn("h-12 w-12 transition-colors duration-300", isHovered ? "text-primary" : "text-muted-foreground")} />

                    {university.verificationStatus === 'VERIFIED' && (
                        <span className="absolute top-4 right-4 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                        </span>
                    )}

                    {/* Admin Action Badge */}
                    {isAdmin && (
                        <div className="absolute top-4 left-4">
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                <Edit className="w-3 h-3" />
                                Admin View
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col">
                    <h3 className={cn("text-xl font-bold mb-2 line-clamp-1 transition-colors duration-200", isHovered ? "text-primary" : "text-foreground")} title={university.institutionName}>
                        {university.institutionName}
                    </h3>
                    <div className="flex items-center text-muted-foreground mb-4 text-sm">
                        <MapPin className="h-4 w-4 mr-1 shrink-0" />
                        <span className="line-clamp-1">{university.city}, {university.country}</span>
                    </div>

                    {/* Preview Content */}
                    <div className="space-y-2 mb-6 flex-1">
                        <div className="text-sm text-foreground/80">
                            <span className="font-medium text-foreground">{university.programs?.length || 0}</span> Programs Available
                        </div>
                        {isHovered && university.programs && university.programs.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground space-y-1 animate-in fade-in duration-300">
                                <p className="font-semibold text-primary/80 uppercase tracking-wider text-[10px]">Top Programs</p>
                                {university.programs.slice(0, 3).map((prog: any, i: number) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-primary/50" />
                                        <span className="truncate">{prog.programName || 'Program'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        variant={isHovered ? "default" : "outline"}
                        className="w-full mt-auto transition-all duration-300"
                    >
                        {isAdmin ? "Manage University" : "View Details"}
                    </Button>
                </div>
            </InteractiveCard>
        </Link>
    )
}
