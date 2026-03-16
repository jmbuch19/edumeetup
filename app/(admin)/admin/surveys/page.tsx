import { getSurveyDashboardData } from "./actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MessageSquareHeart, Users, AlertCircle, Smile, Meh, Frown } from "lucide-react"

export default async function SurveysPage() {
  const { stats, responses } = await getSurveyDashboardData()

  // Helper to color-code NPS scores
  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 7) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 9) return <Smile className="w-4 h-4 text-green-600" />
    if (score >= 7) return <Meh className="w-4 h-4 text-yellow-600" />
    return <Frown className="w-4 h-4 text-red-600" />
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">NPS Feedback Surveys</h1>
        <p className="text-muted-foreground">
          View user satisfaction scores and qualitative feedback to improve the platform experience.
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Net Promoter Score */}
        <Card className={stats.npsScore > 0 ? "border-primary/50 bg-primary/5 shadow-sm" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Promoter Score</CardTitle>
            <MessageSquareHeart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.npsScore}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Score ranges from -100 to +100
            </p>
          </CardContent>
        </Card>

        {/* Promoters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Promoters (9-10)</CardTitle>
            <Smile className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.promoters}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.promoters/stats.total)*100) : 0}% of all responses
            </p>
          </CardContent>
        </Card>

        {/* Passives */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passives (7-8)</CardTitle>
            <Meh className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.passives}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.passives/stats.total)*100) : 0}% of all responses
            </p>
          </CardContent>
        </Card>

        {/* Detractors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Detractors (0-6)</CardTitle>
            <Frown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.detractors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.detractors/stats.total)*100) : 0}% of all responses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Raw Feedback Data Table */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Detailed Feedback ({stats.total})</CardTitle>
          <CardDescription>
            Individual qualitative feedback submissions with contact preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[100px]">Score</TableHead>
                  <TableHead className="w-[180px]">User & Role</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead className="w-[150px]">Contact Info</TableHead>
                  <TableHead className="w-[120px] text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No survey responses recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  responses.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1.5 w-fit ${getScoreColor(res.score)}`}>
                          {getScoreIcon(res.score)}
                          <span className="font-bold">{res.score}/10</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm truncate">{res.user.name || "Unknown User"}</span>
                          <span className="text-xs text-muted-foreground truncate">{res.role}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        {res.feedback ? (
                          <span className="text-sm block break-words">"{res.feedback}"</span>
                        ) : (
                          <span className="text-xs italic text-slate-400">No written feedback provided.</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {res.allowContact ? (
                          <div className="flex flex-col">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 w-fit mb-1 text-[10px]">Opted In</Badge>
                            <span className="text-xs truncate" title={res.user.email}>{res.user.email}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">No Contact</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(res.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
