'use client'

import { useState } from 'react'
import { Bell, X, ArrowRight, Trophy, AlertTriangle, Info, Zap } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { AdminNotification, MilestoneAlert } from '@/app/(admin)/admin/actions/notifications'

interface NotificationBellProps {
  notifications: AdminNotification[]
  milestones: MilestoneAlert[]
  unreadCount: number
}

const TYPE_STYLES = {
  URGENT: {
    bg: 'bg-red-50 border-red-200',
    icon: <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />,
    badge: 'bg-red-100 text-red-700',
    label: 'Urgent',
  },
  WARNING: {
    bg: 'bg-amber-50 border-amber-200',
    icon: <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />,
    badge: 'bg-amber-100 text-amber-700',
    label: 'Action Needed',
  },
  INFO: {
    bg: 'bg-blue-50 border-blue-200',
    icon: <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />,
    badge: 'bg-blue-100 text-blue-700',
    label: 'Info',
  },
  MILESTONE: {
    bg: 'bg-purple-50 border-purple-200',
    icon: <Trophy className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />,
    badge: 'bg-purple-100 text-purple-700',
    label: 'Milestone',
  },
}

export function NotificationBell({ notifications, milestones, unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  const hasUrgent = notifications.some(n => n.type === 'URGENT')
  const isEmpty = notifications.length === 0 && milestones.length === 0

  return (
    <>
      {/* ── Bell Button ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="Open notifications"
      >
        <Bell className={cn("h-5 w-5", hasUrgent && "text-red-500")} />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1",
            hasUrgent ? "bg-red-500 animate-pulse" : "bg-primary"
          )}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-out Panel ───────────────────────────────────────────────── */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEmpty ? 'All clear — nothing needs attention' : `${notifications.length + milestones.length} items`}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">All caught up!</h3>
              <p className="text-sm text-gray-500">No pending actions or alerts right now.</p>
            </div>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="px-4 pt-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                🎉 Milestones
              </p>
              <div className="space-y-2">
                {milestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{milestone.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-purple-900">{milestone.title}</p>
                        <p className="text-xs text-purple-700 mt-0.5">{milestone.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgent notifications */}
          {notifications.filter(n => n.type === 'URGENT').length > 0 && (
            <div className="px-4 pt-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                ⚠️ Urgent
              </p>
              <div className="space-y-2">
                {notifications
                  .filter(n => n.type === 'URGENT')
                  .map(n => <NotificationCard key={n.id} notification={n} onClose={() => setOpen(false)} />)}
              </div>
            </div>
          )}

          {/* Warning notifications */}
          {notifications.filter(n => n.type === 'WARNING').length > 0 && (
            <div className="px-4 pt-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                Action Needed
              </p>
              <div className="space-y-2">
                {notifications
                  .filter(n => n.type === 'WARNING')
                  .map(n => <NotificationCard key={n.id} notification={n} onClose={() => setOpen(false)} />)}
              </div>
            </div>
          )}

          {/* Info notifications */}
          {notifications.filter(n => n.type === 'INFO').length > 0 && (
            <div className="px-4 pt-4 pb-6">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                Platform Updates
              </p>
              <div className="space-y-2">
                {notifications
                  .filter(n => n.type === 'INFO')
                  .map(n => <NotificationCard key={n.id} notification={n} onClose={() => setOpen(false)} />)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 shrink-0">
          <Link
            href="/admin/overview"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary hover:underline"
          >
            View Full Overview <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  )
}

// ── Individual notification card ──────────────────────────────────────────────
function NotificationCard({
  notification,
  onClose,
}: {
  notification: AdminNotification
  onClose: () => void
}) {
  const style = TYPE_STYLES[notification.type]

  const content = (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-xl border transition-all",
      style.bg,
      notification.actionUrl && "hover:shadow-sm cursor-pointer"
    )}>
      <span className="text-lg shrink-0">{notification.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", style.badge)}>
            {style.label}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>
      </div>
      {notification.actionUrl && (
        <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
      )}
    </div>
  )

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} onClick={onClose}>
        {content}
      </Link>
    )
  }

  return content
}
