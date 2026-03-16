import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NpsSurveyPopup } from "@/components/NpsSurveyPopup"

export async function NpsSurveyWrapper() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { 
      npsSurveyCompleted: true, 
      npsSurveyDismissedAt: true,
      createdAt: true
    }
  })

  if (!user) return null

  // 1. If they already completed it, never show it again
  if (user.npsSurveyCompleted) return null

  // 2. Only show if the account is at least 3 days old ("visited for quite a few time")
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  if (user.createdAt > threeDaysAgo) return null

  // 3. If they dismissed it, wait 30 days before asking again
  if (user.npsSurveyDismissedAt) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    if (user.npsSurveyDismissedAt > thirtyDaysAgo) return null
  }

  // All checks pass - render the client popup
  return <NpsSurveyPopup />
}
