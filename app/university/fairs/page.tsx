import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUniversityOutreach } from "./actions"
import FairInvitationCard from "@/components/university/FairInvitationCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function UniversityFairsPage() {
    const session = await auth()

    if (!session || !session.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
        redirect('/login')
    }

    const outreachItemsRaw = await getUniversityOutreach()

    // Serialize dates for Client Component
    const outreachItems = outreachItemsRaw.map(item => ({
        ...item,

        sentAt: new Date(item.sentAt as any).toISOString(),
        respondedAt: item.respondedAt ? new Date(item.respondedAt as any).toISOString() : null,
        hostRequest: {
            ...item.hostRequest,
            createdAt: new Date(item.hostRequest.createdAt as any).toISOString(),
            updatedAt: new Date(item.hostRequest.updatedAt as any).toISOString(),
            preferredDateStart: new Date(item.hostRequest.preferredDateStart as any).toISOString(),
            preferredDateEnd: new Date(item.hostRequest.preferredDateEnd as any).toISOString(),
        }
    }))

    const pending = outreachItems.filter(i => i.status === 'SENT')
    const history = outreachItems.filter(i => i.status !== 'SENT')

    return (
        <div className="container mx-auto py-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Campus Fair Invitations</h1>
                    <p className="text-slate-600 mt-2">
                        Review invitations from schools and colleges to host recruitment fairs.
                    </p>
                </div>

                <Tabs defaultValue="new" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="new">New Invites {pending.length > 0 && `(${pending.length})`}</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="new" className="space-y-4">
                        {pending.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                <p className="text-slate-500">No new invitations at the moment.</p>
                            </div>
                        ) : (
                            pending.map(item => (
                                <FairInvitationCard key={item.id} outreach={item} />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                        {history.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                <p className="text-slate-500">No response history yet.</p>
                            </div>
                        ) : (
                            history.map(item => (
                                <FairInvitationCard key={item.id} outreach={item} />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
