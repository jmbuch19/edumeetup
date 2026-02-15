'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { markNotificationAsRead } from '@/app/actions'
import { cn } from '@/lib/utils'

interface Notification {
    id: string
    userId: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: Date
}

export function NotificationBell({ notifications = [] }: { notifications: Notification[] }) {
    const [open, setOpen] = useState(false)
    const unreadCount = notifications.filter(n => !n.isRead).length


    const handleMarkAsRead = async (id: string) => {
        // Optimistic update logic could go here, but for MVP we rely on revalidatePath
        await markNotificationAsRead(id)
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-gray-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                        No notifications
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "flex flex-col items-start p-3 cursor-pointer",
                                    !notification.isRead ? "bg-blue-50" : ""
                                )}
                                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                            >
                                <div className="flex justify-between w-full">
                                    <span className={cn("font-medium text-sm", !notification.isRead && "text-primary")}>
                                        {notification.title}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(notification.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {notification.message}
                                </p>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
