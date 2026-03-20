'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { deleteR2File } from '@/lib/r2-delete'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireUniversity() {
    const session = await auth()
    if (!session?.user) redirect('/login')
    const role = (session.user as any).role
    if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') redirect('/login')
    const uni = await prisma.university.findUnique({
        where: { userId: session.user.id! },
        select: { id: true, logo: true },
    })
    if (!uni) redirect('/login')
    return uni
}

// ── Update logo ───────────────────────────────────────────────────────────────
// Called after the logo file has already been uploaded to R2 by /api/upload/logo.
// newLogoUrl is the R2 public URL returned by that endpoint.
export async function updateUniversityLogo(
    newLogoUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const uni = await requireUniversity()
        const oldLogoUrl = uni.logo

        // Save new URL in DB
        await prisma.university.update({
            where: { id: uni.id },
            data: { logo: newLogoUrl },
        })

        // Delete old R2 object (non-fatal — DB update already committed)
        if (oldLogoUrl) {
            await deleteR2File(oldLogoUrl)
        }

        revalidatePath('/university/settings')
        revalidatePath('/university/dashboard')
        return { ok: true }
    } catch (err) {
        console.error('[updateUniversityLogo]')
        return { ok: false, error: 'Failed to save logo. Please try again.' }
    }
}

// ── Remove logo ───────────────────────────────────────────────────────────────
export async function removeUniversityLogo(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const uni = await requireUniversity()
        const oldLogoUrl = uni.logo

        // Clear DB first
        await prisma.university.update({
            where: { id: uni.id },
            data: { logo: null },
        })

        // Delete from R2 (non-fatal)
        if (oldLogoUrl) {
            await deleteR2File(oldLogoUrl)
        }

        revalidatePath('/university/settings')
        revalidatePath('/university/dashboard')
        return { ok: true }
    } catch (err) {
        console.error('[removeUniversityLogo]')
        return { ok: false, error: 'Failed to remove logo. Please try again.' }
    }
}
