import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { ids } = body

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ success: false, error: "Missing or invalid ids array" }, { status: 400 })
        }

        // Increment impressions for all provided IDs
        await prisma.sponsoredContent.updateMany({
            where: { id: { in: ids } },
            data: { impressions: { increment: 1 } }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[SponsoredContent Impression Tracking]", error)
        return NextResponse.json({ success: false, error: "Failed to track impressions" }, { status: 500 })
    }
}
