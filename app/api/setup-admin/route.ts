import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const adminEmail = "admin@edumeetup.com"

        // Check if admin exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        })

        if (existingAdmin) {
            return NextResponse.json({ message: "Admin already exists", email: adminEmail })
        }

        // Create Admin
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
            password: "adminpassword123"
        })

    } catch (error) {
        return NextResponse.json({ error: "Failed to create admin", details: error }, { status: 500 })
    }
}
