import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnnouncementsManager } from "./announcements-manager"
import { SponsoredContentManager } from "./sponsored-content-manager"
import { NotificationsSender } from "./notifications-sender"
import { StudentSegments } from "./student-segments"
import { getFreshStudents, getDormantStudents } from "./segment-actions"

export const dynamic = 'force-dynamic'

export default async function AdminEngagementPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        redirect("/")
    }

    // Fetch both segments in parallel — non-fatal if one fails
    const [freshResult, dormantResult] = await Promise.allSettled([
        getFreshStudents(),
        getDormantStudents(),
    ])
    const freshStudents = freshResult.status === 'fulfilled' ? freshResult.value : []
    const dormantStudents = dormantResult.status === 'fulfilled' ? dormantResult.value : []

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Engagement &amp; Communication</h1>
                <p className="text-muted-foreground">Manage announcements, notifications, and sponsored content.</p>
            </div>

            <Tabs defaultValue="sponsored" className="space-y-4">
                <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="announcements">System Announcements</TabsTrigger>
                    <TabsTrigger value="sponsored">Sponsored Content</TabsTrigger>
                    <TabsTrigger value="notifications">Send Notifications</TabsTrigger>
                    <TabsTrigger value="fresh">
                        🆕 New Students
                        {freshStudents.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-medium px-1.5 py-0.5 min-w-[1.25rem]">
                                {freshStudents.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="dormant">
                        😴 Dormant
                        {dormantStudents.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground text-[11px] font-medium px-1.5 py-0.5 min-w-[1.25rem]">
                                {dormantStudents.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="announcements">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Announcements</CardTitle>
                            <CardDescription>Broadcast messages to all users or specific roles.</CardDescription>
                        </CardHeader>
                        <CardContent><AnnouncementsManager /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sponsored">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sponsored Content</CardTitle>
                            <CardDescription>Manage promoted content and ads.</CardDescription>
                        </CardHeader>
                        <CardContent><SponsoredContentManager /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Send Notifications</CardTitle>
                            <CardDescription>Send direct alerts to specific users or groups.</CardDescription>
                        </CardHeader>
                        <CardContent><NotificationsSender /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="fresh">
                    <Card>
                        <CardHeader>
                            <CardTitle>🆕 New Students</CardTitle>
                            <CardDescription>
                                Students who joined in the last 30 days. A great time to welcome them and highlight key features.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StudentSegments
                                freshStudents={freshStudents}
                                dormantStudents={[]}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="dormant">
                    <Card>
                        <CardHeader>
                            <CardTitle>😴 Dormant Students</CardTitle>
                            <CardDescription>
                                Students who joined over 60 days ago and haven't been seen in 60+ days. Re-engage them with a personalised nudge or email.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StudentSegments
                                freshStudents={[]}
                                dormantStudents={dormantStudents}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

