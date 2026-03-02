'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, X, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import type { AdminNotification, MilestoneAlert } from '@/app/(admin)/admin/actions/notifications'

interface Props {
  notifications: AdminNotification[]
  milestones: MilestoneAlert[]
  unreadCount: number
}

function NotifIcon({ type }: { type: AdminNotification['type'] }) {
  if (type === 'URGENT') return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
  if (type === 'WARNING') return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
  return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
}

function NotifItem({ n, onClose }: { n: AdminNotification; onClose: () => void }) {
  const bg =
    n.type === 'URGENT' ? 'bg-red-50 border-red-100' :
    n.type === 'WARNING' ? 'bg-amber-50 border-amber-100' :
    'bg-blue-50 border-blue-100'

  const content = (
    <div className={`flex items-start gap-3 rounded-lg border p-3 transition-opacity hover:opacity-90 ${bg}`}>
      <span className="text-lg leading-none mt-0.5">{n.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-snug">{n.message}</p>
      </div>
      <NotifIcon type={n.type} />
    </div>
  )

  return n.actionUrl ? (
    <Link href={n.actionUrl} onClick={onClose}>{content}</Link>
  ) : (
    <div>{content}</div>
  )
}

export function AdminNotificationBell({ notifications, milestones, unreadCount }: Props) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const urgent = notifications.filter(n => n.type === 'URGENT' || n.type === 'WARNING')
  const info = notifications.filter(n => n.type === 'INFO')
  const hasUrgent = urgent.some(n => n.type === 'URGENT')

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white
            ${hasUrgent ? 'bg-red-500' : 'bg-blue-500'}`}>
            {hasUrgent && (
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-red-400" />
            )}
            <span className="relative">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </button>

      {/* Slide-out Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">

            {/* Milestones */}
            {milestones.length > 0 && (
              <section className="p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">🎉 Milestones</p>
                {milestones.map(m => (
                  <div key={m.id} className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50 p-3">
                    <span className="text-lg leading-none">{m.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">{m.title}</p>
                      <p className="text-xs text-purple-700 mt-0.5">{m.message}</p>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Urgent / Warnings */}
            {urgent.length > 0 && (
              <section className="p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">⚠️ Urgent</p>
                {urgent.map(n => <NotifItem key={n.id} n={n} onClose={() => setOpen(false)} />)}
              </section>
            )}

            {/* Info */}
            {info.length > 0 && (
              <section className="p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">📊 Platform Updates</p>
                {info.map(n => <NotifItem key={n.id} n={n} onClose={() => setOpen(false)} />)}
              </section>
            )}

            {/* Empty state */}
            {notifications.length === 0 && milestones.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <CheckCircle className="h-8 w-8 text-green-400 mb-3" />
                <p className="text-sm font-medium text-gray-700">All clear!</p>
                <p className="text-xs text-gray-400 mt-1">No pending actions or alerts right now.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
