/**
 * AI Model Configuration
 *
 * To upgrade to a newer model, change the constant here.
 * All routes/components that import from this file will use the new model automatically.
 *
 * Anthropic model release reference:
 * https://docs.anthropic.com/en/docs/about-claude/models
 *
 * Current production: claude-3-5-sonnet-20241022
 * Previous:          claude-3-haiku-20240307 (used for lightweight tasks)
 */

// ── Anthropic ──────────────────────────────────────────────────────────────
export const ANTHROPIC_ADVISOR_MODEL = 'claude-sonnet-4-5'

// Lower-cost model for tasks that don't need full Sonnet quality
// (bot fallback, classification, short summaries etc.)
export const ANTHROPIC_LITE_MODEL = 'claude-3-haiku-20240307'
