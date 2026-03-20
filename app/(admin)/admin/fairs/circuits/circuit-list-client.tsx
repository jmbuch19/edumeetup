'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, CalendarDays, MoreHorizontal, Flag, Users, Clock } from 'lucide-react'
import { format } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { updateCircuitStatus } from './actions'

export function CircuitListClient({ initialCircuits, currentPage = 1, totalPages = 1 }: { initialCircuits: any[], currentPage?: number, totalPages?: number }) {
    const [circuits, setCircuits] = useState(initialCircuits)

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const result = await updateCircuitStatus(id, newStatus as any)
            setCircuits(circuits.map(c => c.id === id ? { ...c, ...result.circuit } : c))
            toast.success(`Circuit status updated to ${newStatus}`)
            if (result.warning) toast.warning(result.warning)
        } catch (error) {
            toast.error("Failed to update status")
        }
    }

    return (
        <div className="grid gap-4">
            {circuits.map((circuit) => (
                <Card key={circuit.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row items-stretch">
                            {/* Status Banner */}
                            <div className={`w-1.5 flex-shrink-0 ${
                                circuit.status === 'PUBLISHED' ? 'bg-green-500' :
                                circuit.status === 'DRAFT' ? 'bg-amber-400' :
                                circuit.status === 'COMPLETED' ? 'bg-blue-500' :
                                'bg-red-500'
                            }`} />
                            
                            <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-xl font-bold text-slate-900">{circuit.name}</h3>
                                                <Badge variant={
                                                    circuit.status === 'PUBLISHED' ? "default" : 
                                                    circuit.status === 'DRAFT' ? "secondary" : 
                                                    "outline"
                                                }>
                                                    {circuit.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2">{circuit.description}</p>
                                        </div>
                                        <div className="flex-shrink-0 ml-4 hidden md:block text-right">
                                            <p className="text-sm font-semibold text-slate-700">{circuit.season}</p>
                                            <p className="text-xs text-slate-400">{circuit.region}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays className="h-4 w-4 text-slate-400" />
                                            <span>
                                                {format(new Date(circuit.startDate), "MMM d")} - {format(new Date(circuit.endDate), "MMM d, yyyy")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            <span>{circuit.venues?.length || 0} Venues</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Flag className="h-4 w-4 text-slate-400" />
                                            <span>{circuit.events?.length || 0} Confirmed Fairs</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {circuit.venues?.slice(0, 5).map((v: any) => (
                                            <span key={v.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                                                {v.city}
                                            </span>
                                        ))}
                                        {circuit.venues?.length > 5 && (
                                            <span className="text-xs text-slate-400 px-2 py-1">
                                                + {circuit.venues.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Analytics / Actions section */}
                            <div className="md:w-64 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50 p-5 md:p-6 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                            <Users className="h-4 w-4" /> US Reps
                                        </span>
                                        <span className="font-bold text-slate-900">{circuit.foreignReps?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                            <Clock className="h-4 w-4" /> Notice
                                        </span>
                                        <span className="font-semibold text-slate-700">
                                            {circuit.noticeDays ? `${circuit.noticeDays} days` : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mt-6 flex justify-end">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 bg-white shadow-xl z-50">
                                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(circuit.id, 'DRAFT')} disabled={circuit.status === 'DRAFT'}>
                                                Set to Draft
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(circuit.id, 'PUBLISHED')} disabled={circuit.status === 'PUBLISHED'}>
                                                Publish to Public
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(circuit.id, 'ONGOING')} disabled={circuit.status === 'ONGOING'}>
                                                Mark as Ongoing
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(circuit.id, 'COMPLETED')} disabled={circuit.status === 'COMPLETED'}>
                                                Mark Completed
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(circuit.id, 'CANCELLED')} disabled={circuit.status === 'CANCELLED'} className="text-red-600 focus:bg-red-50">
                                                Cancel Circuit
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            
            {circuits.length === 0 && (
                <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
                    <h3 className="text-lg font-semibold text-slate-900">No Circuits Found</h3>
                    <p className="text-slate-500 mt-1">Has the database seed script been run?</p>
                </div>
            )}

            {circuits.length > 0 && totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        disabled={currentPage <= 1}
                        onClick={() => window.location.href = `?page=${currentPage - 1}`}
                    >
                        Previous
                    </Button>
                    <div className="flex items-center px-4 text-sm font-medium text-slate-600">
                        Page {currentPage} of {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        disabled={currentPage >= totalPages}
                        onClick={() => window.location.href = `?page=${currentPage + 1}`}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}
