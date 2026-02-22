import { LayoutDashboard, Users, School, Ticket, LucideIcon } from "lucide-react"

export interface AdminNavItem {
    href: string
    icon: LucideIcon
    label: string
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/universities", icon: School, label: "Universities" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/tickets", icon: Ticket, label: "Support Tickets" },
    { href: "/admin/advisory", icon: Users, label: "Advisory Requests" },
]
