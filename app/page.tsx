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

async function getPublishedCircuits() {
  const now = new Date()
  return withCache('homepage:circuits', 60, () =>
    prisma.fairCircuit.findMany({
      where: {
        status: { in: ['PUBLISHED', 'ONGOING'] },
        endDate: { gte: now }
      },
      orderBy: { startDate: 'asc' },
      include: {
        venues: true,
        events: true
      },
      take: 6
    })
  )
}

export default async function Home() {
  // Graceful fallback: if DB is down or cold-starting, show default hero
  const slides = await getHeroSlides().catch(() => [])
  const circuits = await getPublishedCircuits().catch(() => [])
  return <HomeClient slides={slides} circuits={circuits} />
}
