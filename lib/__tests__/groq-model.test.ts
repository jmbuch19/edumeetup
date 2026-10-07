import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_GROQ_CHAT_MODEL, getGroqChatModelId, groqProviderOptions } from '../ai'

test('defaults to openai/gpt-oss-120b when GROQ_CHAT_MODEL is unset or blank', () => {
  const prev = process.env.GROQ_CHAT_MODEL
  delete process.env.GROQ_CHAT_MODEL
  assert.equal(getGroqChatModelId(), DEFAULT_GROQ_CHAT_MODEL)
  process.env.GROQ_CHAT_MODEL = '   '
  assert.equal(getGroqChatModelId(), 'openai/gpt-oss-120b')
  if (prev === undefined) delete process.env.GROQ_CHAT_MODEL; else process.env.GROQ_CHAT_MODEL = prev
})

test('GROQ_CHAT_MODEL overrides the default', () => {
  const prev = process.env.GROQ_CHAT_MODEL
  process.env.GROQ_CHAT_MODEL = ' qwen/qwen3.8-27b '
  assert.equal(getGroqChatModelId(), 'qwen/qwen3.8-27b')
  if (prev === undefined) delete process.env.GROQ_CHAT_MODEL; else process.env.GROQ_CHAT_MODEL = prev
})

test('low reasoning effort only for gpt-oss models', () => {
  assert.deepEqual(groqProviderOptions('openai/gpt-oss-120b'), { groq: { reasoningEffort: 'low' } })
  assert.equal(groqProviderOptions('qwen/qwen3.8-27b'), undefined)
})
