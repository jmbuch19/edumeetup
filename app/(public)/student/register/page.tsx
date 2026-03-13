import { prisma } from '@/lib/prisma'
import StudentRegisterForm from './StudentRegisterForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Create Student Profile | EdUmeetup',
    description: 'Complete your profile to find your perfect university match',
}

// Ensure the page is dynamically rendered so the count is always accurate
// Or let Next.js handle it naturally (it might cache if no dynamic headers are used).
// Since registration page doesn't need to be strictly static:
export const dynamic = 'force-dynamic'

export default async function StudentRegisterPage() {
    // Fetch live student count for the social proof bubble
    const count = await prisma.student.count({
        where: { profileComplete: true }
    })

    return (
        <StudentRegisterForm initialCount={count} />
    )
}
