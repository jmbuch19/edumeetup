"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const surveySchema = z.object({
  score: z.number().min(0).max(10),
  feedback: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  allowContact: z.boolean().default(false)
})

export async function submitNpsSurvey(formData: z.infer<typeof surveySchema>) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    const { score, feedback, role, allowContact } = surveySchema.parse(formData)
    
    // Use an interactive transaction to insert the response and update the user flag safely
    await prisma.$transaction(async (tx) => {
      // Create the survey record
      await tx.npsSurveyResponse.create({
        data: {
          userId: session.user.id,
          score,
          feedback,
          role,
          allowContact
        }
      })
      
      // Update the user tracking flag
      await tx.user.update({
        where: { id: session.user.id },
        data: { npsSurveyCompleted: true }
      })
    })

    // Revalidate layouts to sync strictly
    revalidatePath('/', 'layout')

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid survey data provided." }
    }
    console.error("[submitNpsSurvey] Error:")
    return { error: "Failed to submit survey." }
  }
}

export async function dismissNpsSurvey() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { npsSurveyDismissedAt: new Date() }
    })

    return { success: true }
  } catch (error) {
    console.error("[dismissNpsSurvey] Error:")
    return { error: "Failed to dismiss." }
  }
}
