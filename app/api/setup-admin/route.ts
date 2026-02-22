import { prisma } from "@/lib/prisma"
import { NextResponse, NextRequest } from "next/server"
import { hashPassword } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        const setupKey = process.env.ADMIN_SETUP_KEY

        // 1. Check if Server Configured
        if (!setupKey) {
            console.error("ADMIN_SETUP_KEY is not set in environment variables.")
            return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
        }

        // 2. Check Request Authorization
        const key = req.nextUrl.searchParams.get('key')
        if (!key || key !== setupKey) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // 3. Get Admin Credentials from Env
        const adminEmail = process.env.ADMIN_EMAIL
        const adminPassword = process.env.ADMIN_PASSWORD

        if (!adminEmail || !adminPassword) {
            console.error("ADMIN_EMAIL or ADMIN_PASSWORD not set.")
            return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
        }

        // 4. Check if admin exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        })

        if (existingAdmin) {
            return NextResponse.json({ message: "Admin already exists", email: adminEmail })
        }

        // 5. Create Admin with Hashed Password
        const hashedPassword = await hashPassword(adminPassword)

        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                role: "ADMIN",
                status: "ACTIVE"
            }
        })

        return NextResponse.json({
            message: "Admin created successfully",
            email: admin.email
        }, { status: 201 })

    } catch (error) {
        console.error("Setup admin error:", error)
        return NextResponse.json({ error: "Failed to create admin", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
    }
}
