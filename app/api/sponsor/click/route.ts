import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.redirect(new URL('/', req.url))
    }

    try {
        const item = await prisma.sponsoredContent.findUnique({
            where: { id },
            select: { targetUrl: true }
        })

        if (!item) {
            return NextResponse.redirect(new URL('/', req.url))
        }

        // Increment clicks
        await prisma.sponsoredContent.update({
            where: { id },
            data: { clicks: { increment: 1 } }
        })

        // Redirect user to the target
        return NextResponse.redirect(item.targetUrl)
    } catch (error) {
        console.error("[SponsoredContent Click Tracking]")
        return NextResponse.redirect(new URL('/', req.url))
    }
}
