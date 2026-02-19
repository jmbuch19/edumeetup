import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnnouncementsManager } from "./announcements-manager"
import { SponsoredContentManager } from "./sponsored-content-manager"
import { NotificationsSender } from "./notifications-sender"

export default async function AdminEngagementPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
        redirect("/")
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Engagement & Communication</h1>
                <p className="text-muted-foreground">Manage announcements, notifications, and sponsored content.</p>
            </div>

            <Tabs defaultValue="announcements" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="announcements">System Announcements</TabsTrigger>
                    <TabsTrigger value="sponsored">Sponsored Content</TabsTrigger>
                    <TabsTrigger value="notifications">Send Notifications</TabsTrigger>
                </TabsList>

                <TabsContent value="announcements">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Announcements</CardTitle>
                            <CardDescription>
                                Broadcast messages to all users or specific roles.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AnnouncementsManager />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sponsored">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sponsored Content</CardTitle>
                            <CardDescription>
                                Manage promoted content and ads.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SponsoredContentManager />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Send Notifications</CardTitle>
                            <CardDescription>
                                Send direct alerts to specific users or groups.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <NotificationsSender />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
