import { createGroq } from '@ai-sdk/groq';

// Groq — free API, no billing required, 14,400 req/day on free tier
// Model: llama-3.3-70b-versatile — excellent for Q&A and reasoning
export const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export const google = groq; // alias kept so any other imports don't break
export const model = groq('llama-3.3-70b-versatile');
