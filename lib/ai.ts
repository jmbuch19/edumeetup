import { createGroq } from '@ai-sdk/groq';

// Groq — free API tier available.
// The chat model is configurable via GROQ_CHAT_MODEL so a future Groq
// deprecation only needs an env-var change, not a code change.
// Default: openai/gpt-oss-120b — Groq's recommended production replacement for
// the retired llama-3.3-70b-versatile (shut down 2026-08-16).
// See https://console.groq.com/docs/deprecations
export const DEFAULT_GROQ_CHAT_MODEL = 'openai/gpt-oss-120b';

export const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export function getGroqChatModelId(): string {
    const fromEnv = process.env.GROQ_CHAT_MODEL?.trim();
    return fromEnv ? fromEnv : DEFAULT_GROQ_CHAT_MODEL;
}

/** GPT-OSS models are reasoning models; keep reasoning short so replies fit the token budget. */
export function groqProviderOptions(modelId: string = getGroqChatModelId()) {
    return modelId.startsWith('openai/gpt-oss')
        ? { groq: { reasoningEffort: 'low' as const } }
        : undefined;
}

export const google = groq; // alias kept so any other imports don't break
export const model = groq(getGroqChatModelId());
