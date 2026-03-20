'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type UniversityType = 'STANDALONE' | 'PARENT' | 'SCHOOL'

export interface SetGroupingArgs {
    universityId: string
    type: UniversityType
    groupSlug: string | null
    parentId: string | null
}

/**
 * Admin-only: set or update the institution grouping for a university.
 * Handles all three types: Standalone, Parent Institution, School under Parent.
 */
export async function setUniversityGrouping(args: SetGroupingArgs) {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
        return { error: 'Unauthorized' }
    }

    const { universityId, type, groupSlug, parentId } = args

    try {
        if (type === 'STANDALONE') {
            // Clear all grouping fields
            await prisma.university.update({
                where: { id: universityId },
                data: { isParent: false, parentId: null, groupSlug: null }
            })
        } else if (type === 'PARENT') {
            if (!groupSlug?.trim()) return { error: 'Group slug is required for a Parent Institution.' }

            // Check if slug is already taken by a different parent
            const existing = await prisma.university.findFirst({
                where: { groupSlug: groupSlug.trim(), isParent: true, id: { not: universityId } }
            })
            if (existing) {
                return { error: `Group slug "${groupSlug}" is already used by ${existing.institutionName}.` }
            }

            await prisma.university.update({
                where: { id: universityId },
                data: { isParent: true, parentId: null, groupSlug: groupSlug.trim() }
            })

            // Cascade slug to all linked schools — keeps denormalized field in sync
            // so future search/filter features that query by groupSlug stay accurate.
            await prisma.university.updateMany({
                where: { parentId: universityId },
                data: { groupSlug: groupSlug.trim() }
            })

        } else if (type === 'SCHOOL') {
            if (!parentId) return { error: 'Parent institution is required for a School.' }

            const parent = await prisma.university.findUnique({
                where: { id: parentId },
                select: { isParent: true, groupSlug: true, institutionName: true }
            })
            if (!parent) return { error: 'Parent institution not found.' }
            if (!parent.isParent) return { error: `${parent.institutionName} is not set as a Parent Institution.` }

            await prisma.university.update({
                where: { id: universityId },
                data: { isParent: false, parentId, groupSlug: parent.groupSlug }
            })
        }

        revalidatePath(`/admin/universities/${universityId}`)
        return { success: true }
    } catch (error) {
        console.error('[setUniversityGrouping] error:')
        return { error: 'Failed to update grouping. Please try again.' }
    }
}

/**
 * Admin-only: manually link an existing unlinked university to a parent.
 */
export async function linkSchoolToParent(schoolId: string, parentId: string) {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') return { error: 'Unauthorized' }

    try {
        const parent = await prisma.university.findUnique({
            where: { id: parentId },
            select: { isParent: true, groupSlug: true, institutionName: true }
        })
        if (!parent?.isParent) return { error: 'Target is not a Parent Institution.' }

        await prisma.university.update({
            where: { id: schoolId },
            data: { parentId, groupSlug: parent.groupSlug, isParent: false }
        })

        revalidatePath(`/admin/universities/${parentId}`)
        revalidatePath(`/admin/universities/${schoolId}`)
        return { success: true }
    } catch (error) {
        console.error('[linkSchoolToParent] error:')
        return { error: 'Failed to link school.' }
    }
}
