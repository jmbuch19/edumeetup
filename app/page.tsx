import { prisma } from "@/lib/prisma"
import { HomeClient } from "@/components/home/home-client"

export const dynamic = 'force-dynamic'

async function getHeroSlides() {
  const now = new Date()
  return await prisma.sponsoredContent.findMany({
    where: {
      isActive: true,
      status: "ACTIVE",
      placement: "BANNER",
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 5
  })
}

export default async function Home() {
  const slides = await getHeroSlides()
  return <HomeClient slides={slides} />
}

