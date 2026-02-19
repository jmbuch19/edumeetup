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
        // Find the most recent Magic Link log for this email
        const log = await prisma.systemLog.findFirst({
            where: {
                type: 'MAGIC_LINK',
                metadata: {
                    path: ['email'],
                    equals: email
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (!log) {
            return NextResponse.json({ error: "No magic link found for this email yet. Try requesting one first." }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            email: email,
            generatedAt: log.createdAt,
            magicLink: log.message, // The URL
            instructions: "Click the link below to sign in:"
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
