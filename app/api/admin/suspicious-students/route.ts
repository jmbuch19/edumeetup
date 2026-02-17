
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();

    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch students with any location mismatch
        const suspicious = await prisma.studentProfile.findMany({
            where: {
                OR: [
                    { cityMismatch: true },
                    { pincodeMismatch: true },
                ],
            },
            select: {
                id: true,
                fullName: true,
                country: true,
                city: true,
                pincode: true,

                ipAddress: true,
                ipCity: true,
                ipRegion: true,
                ipCountry: true,
                ipPincode: true,
                ipIsp: true,

                cityMismatch: true,
                pincodeMismatch: true,

                user: {
                    select: {
                        email: true,
                        createdAt: true,
                        status: true
                    }
                }
            },
            orderBy: { updatedAt: "desc" }, // or user.createdAt if we could join sort
        });

        // Format for easy reading in admin UI
        const formatted = suspicious.map((s) => ({
            id: s.id,
            name: s.fullName,
            email: s.user.email,
            createdAt: s.user.createdAt,
            status: s.user.status,

            // What they typed
            input: {
                city: s.city,
                pincode: s.pincode,
                country: s.country
            },

            // What IP says
            ip: {
                address: s.ipAddress,
                city: s.ipCity,
                region: s.ipRegion,
                country: s.ipCountry,
                pincode: s.ipPincode,
                isp: s.ipIsp
            },

            mismatchSummary: [
                s.cityMismatch ? `City: typed "${s.city}" but IP says "${s.ipCity}"` : null,
                s.pincodeMismatch ? `Pincode: typed "${s.pincode}" but IP says "${s.ipPincode}"` : null,
            ]
                .filter(Boolean)
                .join(" | "),
        }));

        return NextResponse.json({ count: formatted.length, students: formatted });
    } catch (error) {
        console.error("Failed to fetch suspicious students:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
