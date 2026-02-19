import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const secret = searchParams.get("secret")

    if (secret !== "edumeetup-fast-pass") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    try {
        // Just get the last 5 magic links generated system-wide
        // (Since this is a low-traffic MVP, this is fine for debugging)
        const logs = await prisma.systemLog.findMany({
            where: {
                type: 'MAGIC_LINK'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        })

        if (logs.length === 0) {
            return NextResponse.json({
                error: "No magic links found in SystemLog. Provider might not be triggering.",
                tips: "Did you click 'Sign In' in the last few minutes?"
            }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            message: "Found recent magic links",
            links: logs.map(log => ({
                email: (log.metadata as any)?.email || "unknown",
                created_at: log.createdAt,
                url: log.message
            }))
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
