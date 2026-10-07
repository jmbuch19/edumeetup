import * as assert from 'node:assert'
import { test } from 'node:test'
import { createStreamDecoder, decodeChatStream } from '../chat/stream-protocol'

test('plain text passes through unchanged', () => {
  assert.strictEqual(decodeChatStream('Hello there!\nHow can I help?'), 'Hello there!\nHow can I help?')
})

test('short plain text and time-like text are not mistaken for protocol', () => {
  assert.strictEqual(decodeChatStream('Hi'), 'Hi')
  assert.strictEqual(decodeChatStream('5:30 pm works'), '5:30 pm works')
  assert.strictEqual(decodeChatStream('a: list item'), 'a: list item')
})

test('data-stream text parts are decoded', () => {
  assert.strictEqual(decodeChatStream('0:"Hello"\n0:" world 😊"\n'), 'Hello world 😊')
  assert.strictEqual(decodeChatStream('0:"line1\\nline2"\n'), 'line1\nline2')
})

test('non-text protocol parts are dropped', () => {
  const raw = 'f:{"messageId":"x"}\n0:"Hi"\n9:{"toolCallId":"1"}\na:{"result":1}\ne:{"finishReason":"stop"}\nd:{"finishReason":"stop"}\n'
  assert.strictEqual(decodeChatStream(raw), 'Hi')
})

test('incremental chunks split mid-line decode correctly', () => {
  const d = createStreamDecoder()
  const chunks = ['0', ':"Hel', 'lo"\n0:"', ' there', '"\n']
  const out = chunks.map(c => d.push(c)).join('') + d.flush()
  assert.strictEqual(out, 'Hello there')
})

test('final line without trailing newline is flushed', () => {
  assert.strictEqual(decodeChatStream('0:"Done"'), 'Done')
})

test('incremental plain text streams immediately once format is known', () => {
  const d = createStreamDecoder()
  assert.strictEqual(d.push('Hel'), 'Hel')
  assert.strictEqual(d.push('lo'), 'lo')
  assert.strictEqual(d.flush(), '')
})
