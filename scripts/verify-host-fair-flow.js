
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("🚀 Starting Host Fair Verification Flow...")

    // 1. Submit Request (Simulating Form)
    console.log("\n1️⃣ Submitting Host Request...")
    const requestData = {
        institutionName: "Test University",
        institutionType: "UNIVERSITY",
        city: "Mumbai",
        state: "Maharashtra",
        websiteUrl: "https://testuni.edu.in",
        contactName: "Dr. Test",
        contactDesignation: "Dean",
        contactEmail: "test@testuni.edu.in",
        contactPhone: "9876543210",
        preferredDateStart: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 days
        preferredDateEnd: new Date(Date.now() + 62 * 24 * 60 * 60 * 1000),
        expectedStudentCount: "100-250",
        preferredCountries: ["USA", "UK"],
        fieldsOfStudy: ["Engineering", "Business"],
        status: "SUBMITTED",
        referenceNumber: `TEST-HCF-${Date.now()}`
    }

    const request = await prisma.hostRequest.create({ data: requestData })
    console.log(`✅ Request Created: ${request.referenceNumber} (ID: ${request.id})`)

    // 2. Approve Request (Simulating Admin)
    console.log("\n2️⃣ Approving Request...")
    const approvedRequest = await prisma.hostRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" }
    })
    console.log(`✅ Request Status: ${approvedRequest.status}`)

    // 3. Send Outreach (Simulating Admin)
    console.log("\n3️⃣ Sending Outreach to Universities...")

    // Find test unis (created in step 1, or seed)
    const universities = await prisma.university.findMany({ take: 2 })
    if (universities.length === 0) {
        throw new Error("❌ No universities found! Run seed script first.")
    }

    let outreachCount = 0
    for (const uni of universities) {
        await prisma.hostRequestOutreach.create({
            data: {
                hostRequestId: request.id,
                universityId: uni.id,
                status: "SENT"
            }
        })
        outreachCount++
    }
    console.log(`✅ Sent outreach to ${outreachCount} universities.`)

    // 4. Respond to Outreach (Simulating University)
    console.log("\n4️⃣ Simulating University Response...")
    const targetOutreach = await prisma.hostRequestOutreach.findFirst({
        where: { hostRequestId: request.id }
    })

    if (!targetOutreach) throw new Error("❌ Outreach record not found!")

    const response = await prisma.hostRequestOutreach.update({
        where: { id: targetOutreach.id },
        data: {
            status: "INTERESTED",
            responseNote: "We would love to attend!",
            respondedAt: new Date()
        },
        include: { university: true }
    })
    console.log(`✅ University ${response.university.institutionName} responded: ${response.status}`)

    console.log("\n✨ Verification Complete!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
