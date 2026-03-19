'use client'

import { motion } from "framer-motion"
import { Calendar, MapPin, Route, ArrowRight, Building2, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

export function FairCircuitsSection({ circuits = [] }: { circuits: any[] }) {
    return (
        <section className="w-full py-20 bg-slate-900 text-white relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-teal-500/20 rounded-full blur-[100px]" />
            
            <div className="container relative max-w-6xl mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-6">
                            <Route className="w-4 h-4 text-teal-400" />
                            <span className="text-sm font-medium text-teal-100 uppercase tracking-wider">Premium Recruitment Tours</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            EdUmeetup <span className="text-teal-400">Fair Circuits</span>
                        </h2>
                        <p className="text-slate-300 text-lg leading-relaxed">
                            Maximize your reach and optimize travel. We organize back-to-back fairs in key geographic clusters, allowing you to connect with pre-qualified students across multiple cities in a single trip.
                        </p>
                    </div>
                    {circuits.length > 0 && (
                        <Link href="/host-a-fair/request">
                            <Button className="bg-teal-500 hover:bg-teal-600 text-white h-12 px-6 rounded-xl text-base">
                                Request a Circuit <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    )}
                </div>

                {circuits.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {circuits.map((circuit, idx) => (
                            <motion.div 
                                key={circuit.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors flex flex-col h-full group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-teal-500/20 text-teal-300 p-2.5 rounded-xl group-hover:bg-teal-500 group-hover:text-white transition-colors">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <Badge variant="outline" className="border-teal-500/30 text-teal-300 bg-teal-500/10">
                                        {circuit.events?.length || 0} Fairs
                                    </Badge>
                                </div>
                                
                                <h3 className="text-2xl font-bold mb-2">{circuit.name}</h3>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px]">{circuit.description}</p>
                                
                                <div className="space-y-3 mb-8 flex-1">
                                    <div className="flex items-center text-sm text-slate-300">
                                        <Calendar className="w-4 h-4 mr-3 text-slate-400" />
                                        <span>
                                            {format(new Date(circuit.startDate), "MMM d")} - {format(new Date(circuit.endDate), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                    <div className="flex items-start text-sm text-slate-300">
                                        <Building2 className="w-4 h-4 mr-3 mt-0.5 text-slate-400 shrink-0" />
                                        <div>
                                            {circuit.venues?.slice(0, 3).map((v: any) => v.city).join(", ")}
                                            {circuit.venues?.length > 3 && ` +${circuit.venues.length - 3} more`}
                                            {(!circuit.venues || circuit.venues.length === 0) && "Venues TBD"}
                                        </div>
                                    </div>
                                </div>
                                <Link href={`/host-a-fair/request?circuit=${circuit.id}`} className="w-full mt-auto">
                                    <Button variant="outline" className="w-full border-white/20 text-slate-100 hover:bg-white hover:text-slate-900 transition-colors bg-transparent">
                                        See Requirements
                                    </Button>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                                <Ticket className="w-8 h-8 text-teal-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Upcoming Circuits Being Finalized</h3>
                            <p className="text-slate-400 text-lg mb-8">
                                We are currently curating our next series of high-impact recruitment tours. Join our waitlist or request a custom fair for your institution.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/university/register">
                                    <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white min-w-[200px] text-base h-12">
                                        Partner with Us
                                    </Button>
                                </Link>
                                <Link href="/host-a-fair">
                                    <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white hover:text-slate-900 min-w-[200px] text-base h-12 bg-transparent">
                                        Host a Custom Fair
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
