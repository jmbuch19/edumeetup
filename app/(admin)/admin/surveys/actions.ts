"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type SurveyStats = {
  total: number
  promoters: number // 9-10
  passives: number  // 7-8
  detractors: number // 0-6
  npsScore: number // % Promoters - % Detractors
}

export type SurveyResponseItem = {
  id: string
  score: number
  feedback: string | null
  role: string
  allowContact: boolean
  createdAt: Date
  user: {
    name: string | null
    email: string
  }
}

export async function getSurveyDashboardData() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized access")
  }

  // Fetch all responses with user details
  const responses = await prisma.npsSurveyResponse.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  // Calculate stats
  const total = responses.length
  let promoters = 0
  let passives = 0
  let detractors = 0

  responses.forEach((r: any) => {
    if (r.score >= 9) promoters++
    else if (r.score >= 7) passives++
    else detractors++
  })

  let npsScore = 0
  if (total > 0) {
    const percentPromoters = (promoters / total) * 100
    const percentDetractors = (detractors / total) * 100
    npsScore = Math.round(percentPromoters - percentDetractors)
  }

  const stats: SurveyStats = {
    total,
    promoters,
    passives,
    detractors,
    npsScore
  }

  return {
    stats,
    responses: responses as SurveyResponseItem[]
  }
}
