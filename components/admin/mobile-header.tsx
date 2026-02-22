"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Menu, LogOut, LucideIcon } from "lucide-react"
import { logout } from "@/app/actions"
import { useState } from "react"
import { ADMIN_NAV_ITEMS } from "@/lib/admin-navigation"

interface MobileHeaderProps {
    user: {
        email: string
    }
}

export function MobileHeader({ user }: MobileHeaderProps) {
    const [open, setOpen] = useState(false)

    return (
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
            <Link href="/" className="flex items-center gap-2">
                 <span className="font-bold text-xl text-primary tracking-tight">edUmeetup</span>
                 <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Admin</span>
            </Link>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                   <div className="flex flex-col h-full">
                        <SheetHeader className="p-6 border-b border-gray-200">
                             <SheetTitle className="text-left">
                                <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                                    <span className="font-bold text-xl text-primary tracking-tight">edUmeetup</span>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Admin</span>
                                </Link>
                             </SheetTitle>
                        </SheetHeader>
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {ADMIN_NAV_ITEMS.map((item) => (
                                <NavItem key={item.href} {...item} setOpen={setOpen} />
                            ))}
                        </nav>
                         <div className="p-4 border-t border-gray-200">
                            <div className="flex items-center gap-3 mb-4 px-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    A
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
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
        </div>
    )
}

function NavItem({ href, icon: Icon, label, setOpen }: { href: string; icon: LucideIcon; label: string; setOpen: (open: boolean) => void }) {
    return (
        <Link
            href={href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-primary transition-colors"
        >
            <Icon className="h-5 w-5" />
            {label}
        </Link>
    )
}
