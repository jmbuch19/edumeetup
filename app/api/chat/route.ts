import { google } from '@/lib/ai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-flash'),
    system: `You are the "EdUmeetup Assistant". We are currently in the "Beta Hardening Phase".
    You are helpful, correct, and authoritative about the platform's security and features.

    **CRITICAL INSTRUCTION - LEGAL & SAFETY:**
    - You MUST NOT provide official immigration, visa, or legal advice.
    - If asked about visas (F1, H1B, etc.), say: "I cannot provide official visa or immigration advice. Please consult a qualified immigration attorney or the official government website."

    **CRITICAL INSTRUCTION - MISSING INFORMATION:**
    - If you do not know the answer or if the user asks about a specific university/program you don't have data on, YOU MUST SAY EXACTLY:
      "I do not have that information at this time."
      (Then offer to help with something else).

    **CRITICAL INSTRUCTION - ERROR HANDLING:**
    - If a user mentions "404", "Application Error", "Crash", or "Bug", you MUST IMMEDIATELY:
      1. Apologize for the inconvenience.
      2. Provide this link: [/report-issue](/report-issue)
      3. Ask them to submit a report so our engineering team can fix it.

    **Security & Privacy Queries:**
    - If asked about data security, privacy, or student data retention:
      "We have a strict data policy. Student IDs are automatically deleted after 30 days using a Prisma-based cron job to ensure privacy compliance."

    **Route Mapping & Navigation:**
    - "Host a Fair" or "Campus Fair" -> Direct them to [/host-a-fair](/host-a-fair).
    - "University List" or "Browse Universities" -> Direct them to [/universities](/universities).
    - "Report a Bug" -> Direct them to [/report-issue](/report-issue).

    **Platform Overview:**
    EduMeetup connects students with universities worldwide.
    - **Students**: Create profiles, get matched, RSVP to meetings.
    - **Universities**: Manage programs, schedule meetings, host events.
    
    **Tone:** Professional, reassuring, and technically accurate.`,
    messages,
    tools: {
      checkAvailability: {
        description: 'Check if a university representative is available for a meeting right now.',
        parameters: z.object({
          universityName: z.string().describe('The name of the university to check availability for.'),
        }),
        execute: async ({ universityName }) => {
          try {
            // 1. Find University ID
            const university = await prisma.university.findFirst({
              where: {
                institutionName: {
                  contains: universityName,
                  mode: 'insensitive',
                },
              },
              include: { user: true }
            });

            if (!university) {
              return `I couldn't find a university matching "${universityName}". Please check the spelling.`;
            }

            // 2. Check for Active Slots NOW
            const now = new Date();
            const activeSlots = await prisma.availabilitySlot.findMany({
              where: {
                universityId: university.id,
                isBooked: false,
                startTime: { lte: now },
                endTime: { gte: now },
              },
              include: {
                repUser: true
              }
            });

            if (activeSlots.length > 0) {
              const repNames = activeSlots.map(slot => slot.repUser.name || 'A Representative').join(', ');
              return `Yes! ${repNames} from ${university.institutionName} is available for a call right now. Would you like to join their meeting room?`;
            } else {
              return `I checked, but no representatives from ${university.institutionName} are available right this moment. You can schedule a meeting for later on their profile page.`;
            }
          } catch (error) {
            console.error("Availability Check Error:", error);
            return "I'm having trouble checking availability right now. Please try again later.";
          }
        },
      },
    },
  });

  return result.toTextStreamResponse();
}
