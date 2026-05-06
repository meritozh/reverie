import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchProviders, streamChat, streamComplete, streamHermesChat, fetchHermesStatus, parseSSEStream } from "./ai-api"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

function createMockSSEResponse(events: string[]): Response {
  const encoder = new TextEncoder()
  let index = 0
  const stream = new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(encoder.encode(events[index]))
        index++
      } else {
        controller.close()
      }
    },
  })
  return new Response(stream, { status: 200 })
}

describe("ai-api client", () => {
  describe("fetchProviders", () => {
    it("calls GET /api/ai/providers and returns provider array", async () => {
      const providers = [
        { type: "openai", name: "OpenAI", configured: true },
        { type: "anthropic", name: "Anthropic", configured: false },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ providers }),
      })

      const result = await fetchProviders()
      expect(mockFetch).toHaveBeenCalledWith("/api/ai/providers")
      expect(result).toEqual(providers)
    })

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
      await expect(fetchProviders()).rejects.toThrow("Failed to fetch providers")
    })
  })

  describe("streamChat", () => {
    it("calls POST /api/ai/chat with correct body and streams chunks", async () => {
      const sseResponse = createMockSSEResponse([
        'event: chunk\ndata: {"type":"content","content":"Hello"}\n\n',
        'event: chunk\ndata: {"type":"content","content":" world"}\n\n',
        "event: done\ndata: {}\n\n",
      ])
      mockFetch.mockResolvedValueOnce(sseResponse)

      const chunks: string[] = []
      let doneCalled = false
      await streamChat(
        [{ role: "user", content: "hi" }],
        "openai",
        {
          onChunk: (c) => chunks.push(c),
          onError: () => {},
          onDone: () => { doneCalled = true },
        }
      )

      expect(mockFetch).toHaveBeenCalledWith("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], provider: "openai" }),
        signal: undefined,
      })
      expect(chunks).toEqual(["Hello", " world"])
      expect(doneCalled).toBe(true)
    })

    it("passes signal option to fetch", async () => {
      const controller = new AbortController()
      const sseResponse = createMockSSEResponse(["event: done\ndata: {}\n\n"])
      mockFetch.mockResolvedValueOnce(sseResponse)

      await streamChat(
        [{ role: "user", content: "hi" }],
        "openai",
        { onChunk: () => {}, onError: () => {}, onDone: () => {} },
        { signal: controller.signal }
      )

      expect(mockFetch).toHaveBeenCalledWith("/api/ai/chat", expect.objectContaining({
        signal: controller.signal,
      }))
    })

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
      await expect(
        streamChat([], "openai", { onChunk: () => {}, onError: () => {}, onDone: () => {} })
      ).rejects.toThrow("AI chat failed")
    })

    it("handles error events from stream", async () => {
      const sseResponse = createMockSSEResponse([
        'event: chunk\ndata: {"type":"error","error":"Rate limited"}\n\n',
        "event: done\ndata: {}\n\n",
      ])
      mockFetch.mockResolvedValueOnce(sseResponse)

      let errorMsg = ""
      await streamChat(
        [{ role: "user", content: "hi" }],
        "openai",
        {
          onChunk: () => {},
          onError: (e) => { errorMsg = e },
          onDone: () => {},
        }
      )

      expect(errorMsg).toBe("Rate limited")
    })
  })

  describe("streamComplete", () => {
    it("calls POST /api/ai/complete with correct body and streams chunks", async () => {
      const sseResponse = createMockSSEResponse([
        'event: chunk\ndata: {"type":"content","content":"completed text"}\n\n',
        "event: done\ndata: {}\n\n",
      ])
      mockFetch.mockResolvedValueOnce(sseResponse)

      const chunks: string[] = []
      await streamComplete(
        "some text",
        "complete",
        "anthropic",
        {
          onChunk: (c) => chunks.push(c),
          onError: () => {},
          onDone: () => {},
        }
      )

      expect(mockFetch).toHaveBeenCalledWith("/api/ai/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "some text", action: "complete", provider: "anthropic" }),
        signal: undefined,
      })
      expect(chunks).toEqual(["completed text"])
    })

    it("passes language and model options", async () => {
      const sseResponse = createMockSSEResponse(["event: done\ndata: {}\n\n"])
      mockFetch.mockResolvedValueOnce(sseResponse)

      await streamComplete(
        "text",
        "summarize",
        "openai",
        { onChunk: () => {}, onError: () => {}, onDone: () => {} },
        { model: "gpt-4", language: "en", signal: undefined }
      )

      expect(mockFetch).toHaveBeenCalledWith("/api/ai/complete", expect.objectContaining({
        body: JSON.stringify({
          text: "text",
          action: "summarize",
          provider: "openai",
          model: "gpt-4",
          language: "en",
        }),
      }))
    })

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })
      await expect(
        streamComplete("text", "action", "openai", { onChunk: () => {}, onError: () => {}, onDone: () => {} })
      ).rejects.toThrow("AI complete failed")
    })
  })

  describe("streamHermesChat", () => {
    it("calls POST /api/hermes/chat with correct body and streams chunks", async () => {
      const sseResponse = createMockSSEResponse([
        'event: chunk\ndata: {"type":"content","content":"Hermes"}\n\n',
        'event: chunk\ndata: {"type":"content","content":" response"}\n\n',
        "event: done\ndata: {}\n\n",
      ])
      mockFetch.mockResolvedValueOnce(sseResponse)

      const chunks: string[] = []
      let doneCalled = false
      await streamHermesChat(
        [{ role: "user", content: "hello" }],
        {
          onChunk: (c) => chunks.push(c),
          onError: () => {},
          onDone: () => { doneCalled = true },
        }
      )

      expect(mockFetch).toHaveBeenCalledWith("/api/hermes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
        signal: undefined,
      })
      expect(chunks).toEqual(["Hermes", " response"])
      expect(doneCalled).toBe(true)
    })

    it("passes model and fileContext options", async () => {
      const sseResponse = createMockSSEResponse(["event: done\ndata: {}\n\n"])
      mockFetch.mockResolvedValueOnce(sseResponse)

      await streamHermesChat(
        [{ role: "user", content: "hi" }],
        { onChunk: () => {}, onError: () => {}, onDone: () => {} },
        { model: "hermes-1", fileContext: "context info" }
      )

      expect(mockFetch).toHaveBeenCalledWith("/api/hermes/chat", expect.objectContaining({
        body: JSON.stringify({
          messages: [{ role: "user", content: "hi" }],
          model: "hermes-1",
          fileContext: "context info",
        }),
      }))
    })

    it("passes signal option to fetch", async () => {
      const controller = new AbortController()
      const sseResponse = createMockSSEResponse(["event: done\ndata: {}\n\n"])
      mockFetch.mockResolvedValueOnce(sseResponse)

      await streamHermesChat(
        [{ role: "user", content: "hi" }],
        { onChunk: () => {}, onError: () => {}, onDone: () => {} },
        { signal: controller.signal }
      )

      expect(mockFetch).toHaveBeenCalledWith("/api/hermes/chat", expect.objectContaining({
        signal: controller.signal,
      }))
    })

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
      await expect(
        streamHermesChat([{ role: "user", content: "hi" }], { onChunk: () => {}, onError: () => {}, onDone: () => {} })
      ).rejects.toThrow("Hermes chat failed")
    })
  })

  describe("fetchHermesStatus", () => {
    it("returns true when configured", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ configured: true }),
      })

      const result = await fetchHermesStatus()
      expect(mockFetch).toHaveBeenCalledWith("/api/hermes/status")
      expect(result).toBe(true)
    })

    it("returns false when not configured", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ configured: false }),
      })

      const result = await fetchHermesStatus()
      expect(result).toBe(false)
    })

    it("returns false on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      const result = await fetchHermesStatus()
      expect(result).toBe(false)
    })

    it("returns false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const result = await fetchHermesStatus()
      expect(result).toBe(false)
    })
  })

  describe("parseSSEStream", () => {
    it("handles partial data split across reads", async () => {
      const sseResponse = createMockSSEResponse([
        "event: chu",
        "nk\ndata: {\"type\":\"co",
        "ntent\",\"content\":\"Hello\"}\n\nevent: done\ndata: {}\n\n",
      ])
      mockFetch.mockResolvedValueOnce(sseResponse)

      const chunks: string[] = []
      let doneCalled = false
      await parseSSEStream(sseResponse, {
        onChunk: (c) => chunks.push(c),
        onError: () => {},
        onDone: () => { doneCalled = true },
      })

      expect(chunks).toEqual(["Hello"])
      expect(doneCalled).toBe(true)
    })

    it("calls onError for error type chunks", async () => {
      const sseResponse = createMockSSEResponse([
        'event: chunk\ndata: {"type":"error","error":"API error"}\n\n',
        "event: done\ndata: {}\n\n",
      ])
      mockFetch.mockResolvedValueOnce(sseResponse)

      let errorMsg = ""
      await parseSSEStream(sseResponse, {
        onChunk: () => {},
        onError: (e) => { errorMsg = e },
        onDone: () => {},
      })

      expect(errorMsg).toBe("API error")
    })

    it("skips malformed JSON in data lines", async () => {
      const sseResponse = createMockSSEResponse([
        "event: chunk\ndata: not-json\n\n",
        'event: chunk\ndata: {"type":"content","content":"ok"}\n\n',
        "event: done\ndata: {}\n\n",
      ])
      mockFetch.mockResolvedValueOnce(sseResponse)

      const chunks: string[] = []
      await parseSSEStream(sseResponse, {
        onChunk: (c) => chunks.push(c),
        onError: () => {},
        onDone: () => {},
      })

      expect(chunks).toEqual(["ok"])
    })

    it("calls onDone and stops on done event", async () => {
      const sseResponse = createMockSSEResponse([
        "event: done\ndata: {}\n\n",
      ])
      mockFetch.mockResolvedValueOnce(sseResponse)

      let doneCalled = false
      await parseSSEStream(sseResponse, {
        onChunk: () => {},
        onError: () => {},
        onDone: () => { doneCalled = true },
      })

      expect(doneCalled).toBe(true)
    })
  })
})
