'use client'

import { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { MapPin, Users, CheckCircle2, Clock, Loader2, ExternalLink, CalendarDays, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { registerForCircuit } from '@/app/actions/circuits'

import type { FairCircuit, FairEvent, University } from '@prisma/client'

export function CircuitInviteCard({ circuit }: { circuit: FairCircuit & { events: FairEvent[], participatingUniversities?: University[], foreignReps?: any[] } }) {
    const [isRegistering, setIsRegistering] = useState(false)
    const [registered, setRegistered] = useState(circuit.foreignReps && circuit.foreignReps.length > 0)

    const startDate = new Date(circuit.startDate)
    const endDate = new Date(circuit.endDate)
    const daysUntilStart = differenceInDays(startDate, new Date())
    const isFrictionWindow = daysUntilStart < 90

    // Compute aggregated states
    const eventCount = circuit.events?.length || 0
    const cities = Array.from(new Set((circuit.events || []).map((e: any) => e.city).filter(Boolean))) as string[]
    const aggregatedStudents = (circuit.events || []).reduce((acc: number, e: any) => acc + (e.expectedStudentCount || 100), 0) // rough proxy

    async function handleJoin(bypassOverlapCheck = false) {
        if (!bypassOverlapCheck && isFrictionWindow && !confirm("This circuit starts in less than 90 days. Late registrations require administrative approval and may incur rushing fees. Do you still wish to submit a request?")) {
            return
        }

        setIsRegistering(true)
        try {
            const res = await registerForCircuit(circuit.id, bypassOverlapCheck)
            
            if (res.isOverlap && !bypassOverlapCheck) {
                setIsRegistering(false) // Release lock so modal doesn't freeze under spinner
                if (window.confirm(res.message)) {
                    await handleJoin(true)
                }
                return;
            }

            if (res.success) {
                setRegistered(true)
                toast.success(isFrictionWindow ? "Late registration request submitted to Admin." : "Successfully joined the circuit.")
            } else {
                toast.error(res.message || "Failed to register")
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setIsRegistering(false)
        }
    }

    if (registered) {
        return (
            <Card className="border-teal-200 bg-teal-50/40">
                <CardHeader className="pb-2 flex flex-row items-start gap-3">
                    <div className="p-2 rounded-full bg-teal-100 text-teal-600 shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-teal-800 leading-tight">
                            You're registered for {circuit.name}
                        </p>
                        <p className="text-xs text-teal-600 mt-0.5">
                            {format(startDate, 'd MMM')} - {format(endDate, 'd MMM yyyy')} · {cities.length} Stops
                        </p>
                    </div>
                </CardHeader>
                <CardFooter className="pt-0">
                    <Button variant="outline" size="sm" className="text-teal-700 border-teal-300 hover:bg-teal-50 flex items-center gap-1.5" disabled>
                        View Itinerary
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="border-indigo-200 bg-white">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 shrink-0 mt-0.5">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900">
                                    Featured Geographic Circuit
                                </p>
                                {isFrictionWindow && (
                                    <Badge variant="destructive" className="text-[10px] bg-amber-500 hover:bg-amber-600">
                                        Late Registration Window
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0 pb-3 space-y-2">
                <p className="font-semibold text-gray-900 leading-tight text-lg">
                    {circuit.name}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <MapPin className="h-4 w-4 text-indigo-400" />
                    <span className="font-medium">Curated Stops:</span> {cities.join(' → ')} 
                    {cities.length === 0 && 'Locations TBA'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 p-2 rounded-md">
                    <Users className="h-4 w-4 text-indigo-500" />
                    Access ~{aggregatedStudents}+ pre-screened students across {eventCount} vetted institutional hosts.
                </div>
                
                {isFrictionWindow && (
                    <div className="mt-4 bg-amber-50/80 border border-amber-200/60 p-3 rounded-lg flex items-start gap-3">
                        <div className="bg-amber-100/50 p-1.5 rounded-md shrink-0">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="text-xs text-amber-800 leading-snug">
                            <span className="font-semibold block mb-0.5">Late Registration Window</span>
                            This circuit begins in less than 90 days. Registrations now require EdUmeetup administrative approval and may incur a rush coordination fee.
                        </p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-0">
                <Button 
                    size="sm" 
                    onClick={() => handleJoin()} 
                    disabled={isRegistering}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                >
                    {isRegistering ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                    {isFrictionWindow ? "Request Exception to Join" : "Join Entire Circuit"}
                </Button>
            </CardFooter>
        </Card>
    )
}
