import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Fair Operations | EdUmeetup' }

// Landing page for EVENT_PLANNER accounts. Middleware restricts /fair-ops to
// EVENT_PLANNER and ADMIN; before this page existed they were sent to a 404.
export default async function FairOpsPage() {
    const session = await auth()
    const isAdmin = session?.user?.role === 'ADMIN'

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center max-w-md w-full shadow-sm">
                <Calendar className="w-12 h-12 text-[#C9A84C] mx-auto mb-4" />
                <h1 className="font-fraunces text-2xl font-bold text-[#0B1340] mb-2">Fair Operations</h1>
                <p className="text-sm text-gray-600 mb-6">
                    Fair planning tools are being set up for your account. In the meantime, the EdUmeetup
                    team will share event details and check-in links with you directly.
                </p>
                <div className="flex flex-col gap-3">
                    {isAdmin && (
                        <Button asChild>
                            <Link href="/admin/fairs">Go to fair administration</Link>
                        </Button>
                    )}
                    <Button asChild variant="outline">
                        <Link href="/contact">Contact the EdUmeetup team</Link>
                    </Button>
                    <Button asChild variant="ghost">
                        <Link href="/api/auth/signout">Sign out</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
