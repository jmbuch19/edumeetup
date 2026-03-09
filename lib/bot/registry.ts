// lib/bot/registry.ts
// Central registry of bot capabilities.
// Inject this into every system prompt so the bot knows exactly what it can do.
// Add new features here as they ship — the bot will discover them automatically.

export const BOT_VERSION = '1.0.0'

export interface BotFeature {
    name: string
    status: 'ACTIVE' | 'BETA' | 'COMING_SOON'
    description: string
}

export const ACTIVE_FEATURES: BotFeature[] = [
    {
        name: 'Portal Support & Help Desk',
        status: 'ACTIVE',
        description: 'Answer questions about how the platform works: QR passes, meetings, login issues, profile updates, fair registration, and navigation.',
    },
    {
        name: 'University Search',
        status: 'ACTIVE',
        description: 'Search verified partner universities in our database by field, country, budget, and degree level.',
    },
    {
        name: 'Global University Search',
        status: 'ACTIVE',
        description: 'If no internal match is found, search global higher-education sources for external recommendations.',
    },
    {
        name: 'Campus Fair Info',
        status: 'ACTIVE',
        description: 'Show upcoming EdUmeetup campus fairs — virtual and in-person.',
    },
    {
        name: 'Meeting Booking',
        status: 'ACTIVE',
        description: 'Guide students to book a 1-on-1 video meeting with a university representative.',
    },
    {
        name: 'Student Profile Matching',
        status: 'ACTIVE',
        description: 'Use the student\'s profile (budget, field, English scores) to personalise recommendations.',
    },
    {
        name: 'Scholarship Portal',
        status: 'BETA',
        description: 'Information on scholarship opportunities — currently in beta.',
    },
]

export function getFeatureSummary(): string {
    return ACTIVE_FEATURES
        .map(f => `- ${f.name} [${f.status}]: ${f.description}`)
        .join('\n')
}
