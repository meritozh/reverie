import { describe, it, expect, vi } from "vitest"
import { createAiRouter } from "./ai"
import type { LLMProvider, ChatMessage, StreamChunk, ProviderType } from "../lib/llm"

function createMockProvider(chunks: StreamChunk[]): LLMProvider {
  return {
    async *chatStream(_messages: ChatMessage[]) {
      for (const chunk of chunks) {
        yield chunk
      }
    },
  }
}

function createErrorMockProvider(): LLMProvider {
  return {
    async *chatStream() {
      throw new Error("Provider exploded")
    },
  }
}

function createApp(configured: ProviderType[] = ["openai"]) {
  const provider = createMockProvider([
    { type: "content", content: "Hello " },
    { type: "content", content: "world" },
  ])
  const errorProvider = createErrorMockProvider()

  return createAiRouter((type) => {
    if (configured.includes(type)) {
      return type === "openai" ? provider : errorProvider
    }
    return null
  })
}

function parseSSE(raw: string) {
  const events: { event: string; data: string }[] = []
  const lines = raw.split("\n")
  let current: { event: string; data: string } | null = null

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      current = { event: line.slice(7), data: "" }
    } else if (line.startsWith("data: ") && current) {
      current.data = line.slice(6)
      events.push(current)
      current = null
    }
  }
  return events
}

describe("GET /providers", () => {
  it("returns all 4 providers with correct names", async () => {
    const app = createApp([])
    const res = await app.request("/providers")
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.providers).toHaveLength(4)

    const types = body.providers.map((p: { type: string }) => p.type)
    expect(types).toEqual(["openai", "anthropic", "zhipu", "gemini"])

    const names = body.providers.map((p: { name: string }) => p.name)
    expect(names).toEqual(["OpenAI", "Anthropic", "Zhipu/GLM", "Gemini"])
  })

  it("shows configured=true when getProvider returns non-null", async () => {
    const app = createApp(["openai"])
    const res = await app.request("/providers")
    const body = await res.json()

    const openai = body.providers.find((p: { type: string }) => p.type === "openai")
    expect(openai.configured).toBe(true)
  })

  it("shows configured=false when getProvider returns null", async () => {
    const app = createApp(["openai"])
    const res = await app.request("/providers")
    const body = await res.json()

    const anthropic = body.providers.find((p: { type: string }) => p.type === "anthropic")
    expect(anthropic.configured).toBe(false)
  })
})

describe("POST /chat", () => {
  it("returns 400 when provider not configured", async () => {
    const app = createApp(["openai"])
    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hi" }],
        provider: "anthropic",
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Provider not configured")
  })

  it("streams content chunks via SSE", async () => {
    const app = createApp(["openai"])
    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        provider: "openai",
      }),
    })
    expect(res.status).toBe(200)

    const raw = await res.text()
    const events = parseSSE(raw)

    const contentEvents = events.filter((e) => e.event === "chunk")
    expect(contentEvents.length).toBeGreaterThanOrEqual(2)

    const first = JSON.parse(contentEvents[0].data)
    expect(first.type).toBe("content")
    expect(first.content).toBe("Hello ")

    const doneEvents = events.filter((e) => e.event === "done")
    expect(doneEvents).toHaveLength(1)
    expect(doneEvents[0].data).toBe("{}")
  })

  it("prepends fileContext as system message", async () => {
    const captured: ChatMessage[][] = []
    const capturingProvider: LLMProvider = {
      async *chatStream(messages: ChatMessage[]) {
        captured.push(messages)
        yield { type: "content", content: "ok" }
      },
    }

    const app = createAiRouter(() => capturingProvider)
    await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "edit this" }],
        provider: "openai",
        fileContext: "document.md content here",
      }),
    })

    expect(captured).toHaveLength(1)
    expect(captured[0][0].role).toBe("system")
    expect(captured[0][0].content).toContain("document.md content here")
    expect(captured[0][0].content).toContain("content editing")
    expect(captured[0][1]).toEqual({ role: "user", content: "edit this" })
  })

  it("handles provider error gracefully", async () => {
    const app = createApp(["anthropic"])
    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hi" }],
        provider: "anthropic",
      }),
    })

    const raw = await res.text()
    const events = parseSSE(raw)

    const errorChunks = events.filter(
      (e) => e.event === "chunk" && JSON.parse(e.data).type === "error"
    )
    expect(errorChunks.length).toBeGreaterThan(0)
    expect(JSON.parse(errorChunks[0].data).error).toBe("Provider exploded")

    const doneEvents = events.filter((e) => e.event === "done")
    expect(doneEvents).toHaveLength(1)
  })
})

describe("POST /complete", () => {
  it("returns 400 when provider not configured", async () => {
    const app = createApp([])
    const res = await app.request("/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Some text",
        action: "continue",
        provider: "openai",
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Provider not configured")
  })

  it("builds correct prompt for continue action", async () => {
    const captured: ChatMessage[][] = []
    const capturingProvider: LLMProvider = {
      async *chatStream(messages: ChatMessage[]) {
        captured.push(messages)
        yield { type: "content", content: "more text" }
      },
    }

    const app = createAiRouter(() => capturingProvider)
    await app.request("/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Once upon a time",
        action: "continue",
        provider: "openai",
      }),
    })

    expect(captured[0]).toHaveLength(1)
    expect(captured[0][0].role).toBe("user")
    expect(captured[0][0].content).toContain("Continue writing")
    expect(captured[0][0].content).toContain("Once upon a time")
  })

  it("builds correct prompt for translate action with language", async () => {
    const captured: ChatMessage[][] = []
    const capturingProvider: LLMProvider = {
      async *chatStream(messages: ChatMessage[]) {
        captured.push(messages)
        yield { type: "content", content: "translation" }
      },
    }

    const app = createAiRouter(() => capturingProvider)
    await app.request("/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Hello world",
        action: "translate",
        provider: "openai",
        language: "Chinese",
      }),
    })

    expect(captured[0][0].content).toContain("Translate")
    expect(captured[0][0].content).toContain("Chinese")
    expect(captured[0][0].content).toContain("Hello world")
  })

  it("builds correct prompt for summarize action", async () => {
    const captured: ChatMessage[][] = []
    const capturingProvider: LLMProvider = {
      async *chatStream(messages: ChatMessage[]) {
        captured.push(messages)
        yield { type: "content", content: "summary" }
      },
    }

    const app = createAiRouter(() => capturingProvider)
    await app.request("/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Long text here",
        action: "summarize",
        provider: "openai",
      }),
    })

    expect(captured[0][0].content).toContain("Summarize")
    expect(captured[0][0].content).toContain("Long text here")
  })

  it("includes fileContext as system message for complete", async () => {
    const captured: ChatMessage[][] = []
    const capturingProvider: LLMProvider = {
      async *chatStream(messages: ChatMessage[]) {
        captured.push(messages)
        yield { type: "content", content: "ok" }
      },
    }

    const app = createAiRouter(() => capturingProvider)
    await app.request("/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "fix this",
        action: "fix-grammar",
        provider: "openai",
        fileContext: "my-doc.mdx",
      }),
    })

    expect(captured[0][0].role).toBe("system")
    expect(captured[0][0].content).toContain("my-doc.mdx")
    expect(captured[0][1].role).toBe("user")
    expect(captured[0][1].content).toContain("Fix grammar")
  })

  it("streams response via SSE", async () => {
    const app = createApp(["openai"])
    const res = await app.request("/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Some text",
        action: "rewrite",
        provider: "openai",
      }),
    })
    expect(res.status).toBe(200)

    const raw = await res.text()
    const events = parseSSE(raw)

    const contentEvents = events.filter((e) => e.event === "chunk")
    expect(contentEvents.length).toBeGreaterThanOrEqual(1)

    const doneEvents = events.filter((e) => e.event === "done")
    expect(doneEvents).toHaveLength(1)
  })

  it("handles error gracefully", async () => {
    const app = createApp(["anthropic"])
    const res = await app.request("/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Some text",
        action: "rewrite",
        provider: "anthropic",
      }),
    })

    const raw = await res.text()
    const events = parseSSE(raw)

    const errorChunks = events.filter(
      (e) => e.event === "chunk" && JSON.parse(e.data).type === "error"
    )
    expect(errorChunks.length).toBeGreaterThan(0)

    const doneEvents = events.filter((e) => e.event === "done")
    expect(doneEvents).toHaveLength(1)
  })
})
