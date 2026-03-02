import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/**
 * One-time admin bootstrap route.
 * Protected by ADMIN_SECRET env var — if unset the route is disabled entirely.
 * Usage: GET /api/setup-admin?secret=<ADMIN_SECRET>
 */
export async function GET(request: NextRequest) {
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret) {
        return NextResponse.json({ error: "Not configured" }, { status: 503 })
    }

    const secret = new URL(request.url).searchParams.get("secret")
    if (secret !== adminSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const adminEmail = process.env.ADMIN_EMAIL ?? "admin@edumeetup.com"

        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        })

        if (existingAdmin) {
            return NextResponse.json({ message: "Admin already exists", email: adminEmail })
        }

        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                role: "ADMIN",
                isActive: true
            }
        })

        return NextResponse.json({
            message: "Admin created successfully",
            email: admin.email,
            note: "Login via magic link — no password is used."
        })

    } catch (error) {
        console.error("[setup-admin] Failed:", error)
        return NextResponse.json({ error: "Failed to create admin" }, { status: 500 })
    }
}
