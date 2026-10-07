// lib/chat/stream-protocol.ts
// Decodes the /api/chat response body for display.
//
// The route normally streams plain text (toTextStreamResponse), but older
// deployments and some canned replies used the AI-SDK "data stream" line format:
//   0:"Hello"\n0:" world"\n
// Showing that raw is what produced `0:"..."` bubbles in the widget. This
// decoder accepts either format, incrementally, so it can sit inside the
// streaming read loop.

const DATA_LINE = /^([0-9a-z]):(.*)$/

export interface StreamDecoder {
  /** Feed raw decoded text; returns the user-visible text it produced. */
  push(chunk: string): string
  /** Call when the stream ends; returns any remaining visible text. */
  flush(): string
}

/** Text part of a single data-stream line, or '' for non-text parts. null = not protocol. */
function decodeLine(line: string): string | null {
  const m = DATA_LINE.exec(line)
  if (!m) return null
  const [, type, payload] = m
  let value: unknown
  try {
    value = JSON.parse(payload)
  } catch {
    return null
  }
  if (type === '0') return typeof value === 'string' ? value : ''
  // 2: data, 3: error, 8: annotations, 9/a/b/c: tool parts, d/e/f: step/finish metadata
  return ''
}

export function createStreamDecoder(): StreamDecoder {
  // undecided until we've seen enough of the first line to tell the format apart
  let mode: 'unknown' | 'text' | 'protocol' = 'unknown'
  let buf = ''

  const drainProtocol = (final: boolean): string => {
    let out = ''
    let idx: number
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx)
      buf = buf.slice(idx + 1)
      if (!line.trim()) continue
      const decoded = decodeLine(line)
      out += decoded ?? line
    }
    if (final && buf.trim()) {
      const decoded = decodeLine(buf)
      out += decoded ?? buf
      buf = ''
    }
    return out
  }

  return {
    push(chunk) {
      if (mode === 'text') return chunk
      buf += chunk
      if (mode === 'unknown') {
        // Need at least `X:` plus the first char of a JSON value to decide.
        const head = buf.trimStart()
        if (head.length < 3 && !buf.includes('\n')) return ''
        const firstLine = head.split('\n')[0]
        mode = /^[0-9a-f]:["{[]/.test(firstLine) ? 'protocol' : 'text'
        if (mode === 'text') {
          const out = buf
          buf = ''
          return out
        }
      }
      return drainProtocol(false)
    },
    flush() {
      if (mode === 'protocol') return drainProtocol(true)
      const out = buf
      buf = ''
      return out
    },
  }
}

/** Convenience for non-streaming use (tests, fallbacks). */
export function decodeChatStream(raw: string): string {
  const d = createStreamDecoder()
  return d.push(raw) + d.flush()
}
