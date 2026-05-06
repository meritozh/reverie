import type { ChatMessage, StreamChunk } from './llm/types'

export interface HermesConfig {
  gatewayUrl: string
  authToken: string
  model?: string
}

export async function* hermesChatStream(
  config: HermesConfig,
  messages: ChatMessage[],
  options?: { model?: string; signal?: AbortSignal },
): AsyncGenerator<StreamChunk> {
  const url = `${config.gatewayUrl.replace(/\/$/, '')}/chat/completions`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options?.model ?? config.model ?? 'default',
      messages,
      stream: true,
    }),
    signal: options?.signal,
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error')
    yield { type: 'error', error: `Hermes gateway error: ${res.status} ${errorText}` }
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield { type: 'content', content }
        } catch {
          // malformed JSON — intentionally skipped
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
