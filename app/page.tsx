import { prisma } from "@/lib/prisma"
import { withCache } from "@/lib/cache"
import { HomeClient } from "@/components/home/home-client"

// Re-validate at most once per minute (ISR-style via Redis cache)
// force-dynamic still applies for auth checks in layout, but
// the DB query itself is served from cache when possible.
export const dynamic = 'force-dynamic'

async function getHeroSlides() {
  const now = new Date()
  return withCache('homepage:hero-slides', 60, () =>
    prisma.sponsoredContent.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        placement: "BANNER",
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 5
    })
  )
}

export default async function Home() {
  // Graceful fallback: if DB is down or cold-starting, show default hero
  const slides = await getHeroSlides().catch(() => [])
  return <HomeClient slides={slides} />
}
