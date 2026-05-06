export interface AIProvider {
  type: string
  name: string
  configured: boolean
}

export interface StreamCallbacks {
  onChunk: (content: string) => void
  onError: (error: string) => void
  onDone: () => void
}

export async function fetchProviders(): Promise<AIProvider[]> {
  const res = await fetch("/api/ai/providers")
  if (!res.ok) throw new Error(`Failed to fetch providers: ${res.status}`)
  const data = await res.json()
  return data.providers
}

export async function streamChat(
  messages: { role: string; content: string }[],
  provider: string,
  callbacks: StreamCallbacks,
  options?: { model?: string; fileContext?: string; signal?: AbortSignal }
): Promise<void> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, provider, ...options }),
    signal: options?.signal,
  })
  if (!res.ok) throw new Error(`AI chat failed: ${res.status}`)
  await parseSSEStream(res, callbacks)
}

export async function streamComplete(
  text: string,
  action: string,
  provider: string,
  callbacks: StreamCallbacks,
  options?: { model?: string; fileContext?: string; language?: string; signal?: AbortSignal }
): Promise<void> {
  const res = await fetch("/api/ai/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, action, provider, ...options }),
    signal: options?.signal,
  })
  if (!res.ok) throw new Error(`AI complete failed: ${res.status}`)
  await parseSSEStream(res, callbacks)
}

export async function streamHermesChat(
  messages: { role: string; content: string }[],
  callbacks: StreamCallbacks,
  options?: { model?: string; fileContext?: string; signal?: AbortSignal }
): Promise<void> {
  const res = await fetch("/api/hermes/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...options }),
    signal: options?.signal,
  })
  if (!res.ok) throw new Error(`Hermes chat failed: ${res.status}`)
  await parseSSEStream(res, callbacks)
}

export async function fetchHermesStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/hermes/status")
    if (!res.ok) return false
    const data = await res.json()
    return data.configured === true
  } catch {
    return false
  }
}

export async function parseSSEStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let currentEvent = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split("\n")
      buffer = lines.pop()!

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith("data: ")) {
          const dataStr = line.slice(6)

          if (currentEvent === "done") {
            callbacks.onDone()
            return
          }

          if (currentEvent === "chunk") {
            try {
              const parsed = JSON.parse(dataStr)
              if (parsed.type === "content") {
                callbacks.onChunk(parsed.content)
              } else if (parsed.type === "error") {
                callbacks.onError(parsed.error)
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
          currentEvent = ""
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
