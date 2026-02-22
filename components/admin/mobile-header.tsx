"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { adminNavItems } from "./nav-config"
import { logout } from "@/app/actions"
import { useState } from "react"

export function MobileHeader({ userEmail }: { userEmail: string }) {
    const [open, setOpen] = useState(false)

    return (
        <header className="md:hidden flex items-center h-16 px-4 border-b bg-white">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                   <div className="flex flex-col h-full">
                        <div className="p-6 border-b border-gray-200">
                            <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                                <span className="font-bold text-xl text-primary tracking-tight">edUmeetup</span>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Admin</span>
                            </Link>
                        </div>

                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {adminNavItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-primary transition-colors"
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="p-4 border-t border-gray-200">
                            <div className="flex items-center gap-3 mb-4 px-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    A
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
                                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                                </div>
                            </div>
                            <form action={logout}>
                                <Button variant="outline" className="w-full justify-start gap-2" type="submit">
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </Button>
                            </form>
                        </div>
                   </div>
                </SheetContent>
            </Sheet>
        </header>
    )
}
