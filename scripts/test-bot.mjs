// Run: node scripts/test-bot.mjs
import { createGroq } from '@ai-sdk/groq'
import { generateText, stepCountIs } from 'ai'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(dir, '..', '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '')
    process.env[key] = val
  }
} catch (e) {
  console.error('Could not read .env:', e.message)
}

console.log('GROQ_API_KEY set:', !!process.env.GROQ_API_KEY)

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

try {
  console.log('\nCalling generateText with llama-3.3-70b-versatile...')
  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    prompt: 'Reply with exactly: "EdUmeetup bot works!"',
    stopWhen: stepCountIs(1),
  })
  console.log('\n✅ SUCCESS! Reply:', text)
} catch (err) {
  console.error('\n❌ ERROR:', err.message)
}
