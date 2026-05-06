import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import type { ProviderType, LLMProvider, ChatMessage, StreamChunk } from "../lib/llm"

interface ProviderInfo {
  type: ProviderType
  name: string
  configured: boolean
}

const PROVIDER_NAMES: Record<ProviderType, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  zhipu: "Zhipu/GLM",
  gemini: "Gemini",
}

const ALL_PROVIDER_TYPES: ProviderType[] = ["openai", "anthropic", "zhipu", "gemini"]

function buildActionPrompt(action: string, text: string, language?: string): string {
  switch (action) {
    case "continue":
      return `Continue writing from where the following text ends. Match the style and language:\n\n${text}`
    case "rewrite":
      return `Improve and rewrite the following text. Keep the same meaning but make it clearer and more engaging:\n\n${text}`
    case "translate":
      return `Translate the following text to ${language || "English"}:\n\n${text}`
    case "summarize":
      return `Summarize the following text concisely:\n\n${text}`
    case "fix-grammar":
      return `Fix grammar, spelling, and punctuation in the following text. Keep the original meaning:\n\n${text}`
    case "change-tone":
      return `Rewrite the following text with a different tone (more professional, casual, formal, etc.):\n\n${text}`
    default:
      return text
  }
}

async function streamChatResponse(
  c: Parameters<Parameters<typeof streamSSE>[1]>[0],
  provider: LLMProvider,
  messages: ChatMessage[],
  model?: string
) {
  return streamSSE(c, async (stream) => {
    try {
      for await (const chunk of provider.chatStream(messages, model ? { model } : undefined)) {
        await stream.writeSSE({
          event: "chunk",
          data: JSON.stringify(chunk),
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Stream error"
      await stream.writeSSE({
        event: "chunk",
        data: JSON.stringify({ type: "error", error: errorMessage } satisfies StreamChunk),
      })
    } finally {
      await stream.writeSSE({
        event: "done",
        data: "{}",
      })
    }
  })
}

export function createAiRouter(getProvider: (type: ProviderType) => LLMProvider | null) {
  const app = new Hono()

  // GET /providers — list available providers
  app.get("/providers", (c) => {
    const providers: ProviderInfo[] = ALL_PROVIDER_TYPES.map((type) => ({
      type,
      name: PROVIDER_NAMES[type],
      configured: getProvider(type) !== null,
    }))
    return c.json({ providers })
  })

  // POST /chat — SSE streaming chat
  app.post("/chat", async (c) => {
    const body = await c.req.json<{
      messages?: ChatMessage[]
      provider?: ProviderType
      model?: string
      fileContext?: string
    }>()

    if (!body.provider) {
      return c.json({ error: "Provider is required" }, 400)
    }

    const provider = getProvider(body.provider)
    if (!provider) {
      return c.json({ error: "Provider not configured" }, 400)
    }

    let messages = body.messages ?? []

    if (body.fileContext) {
      messages = [
        {
          role: "system",
          content: `You are an AI assistant helping with content editing. The user is currently editing a document:\n\n${body.fileContext}`,
        },
        ...messages,
      ]
    }

    return streamChatResponse(c, provider, messages, body.model)
  })

  // POST /complete — SSE streaming completion for inline AI actions
  app.post("/complete", async (c) => {
    const body = await c.req.json<{
      text?: string
      action?: string
      provider?: ProviderType
      model?: string
      fileContext?: string
      language?: string
    }>()

    if (!body.provider) {
      return c.json({ error: "Provider is required" }, 400)
    }

    const provider = getProvider(body.provider)
    if (!provider) {
      return c.json({ error: "Provider not configured" }, 400)
    }

    const prompt = buildActionPrompt(body.action ?? "continue", body.text ?? "", body.language)

    const messages: ChatMessage[] = []

    if (body.fileContext) {
      messages.push({
        role: "system",
        content: `You are an AI assistant helping with content editing. The user is currently editing a document:\n\n${body.fileContext}`,
      })
    }

    messages.push({ role: "user", content: prompt })

    return streamChatResponse(c, provider, messages, body.model)
  })

  return app
}
