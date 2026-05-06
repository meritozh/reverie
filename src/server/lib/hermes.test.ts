// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { hermesChatStream } from './hermes'
import type { HermesConfig } from './hermes'
import type { ChatMessage } from './llm/types'

const messages: ChatMessage[] = [
  { role: 'user', content: 'Hello' },
]

function encodeSSE(lines: string[]): Uint8Array {
  const text = lines.join('\n') + '\n'
  return new TextEncoder().encode(text)
}

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('hermesChatStream', () => {
  it('yields content chunks from SSE stream', async () => {
    const body = encodeSSE([
      'data: {"choices":[{"delta":{"content":"Hi "}}]}',
      'data: {"choices":[{"delta":{"content":"there"}}]}',
      'data: [DONE]',
    ])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'tok-123',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { type: 'content', content: 'Hi ' },
      { type: 'content', content: 'there' },
    ])
  })

  it('yields error chunk on non-ok gateway response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'tok-123',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { type: 'error', error: 'Hermes gateway error: 503 Service Unavailable' },
    ])
  })

  it('sends auth token in Authorization header', async () => {
    const body = encodeSSE(['data: [DONE]'])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'my-secret-token',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages)) {
      chunks.push(chunk)
    }

    expect(fetch).toHaveBeenCalledWith(
      'https://hermes.example.com/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer my-secret-token',
        }),
      }),
    )
  })

  it('strips trailing slash from gateway URL', async () => {
    const body = encodeSSE(['data: [DONE]'])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com/',
      authToken: 'tok',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages)) {
      chunks.push(chunk)
    }

    expect(fetch).toHaveBeenCalledWith(
      'https://hermes.example.com/chat/completions',
      expect.any(Object),
    )
  })

  it('forwards AbortSignal to fetch', async () => {
    const body = encodeSSE(['data: [DONE]'])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'tok',
    }

    const controller = new AbortController()
    const chunks = []
    for await (const chunk of hermesChatStream(config, messages, {
      signal: controller.signal,
    })) {
      chunks.push(chunk)
    }

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('stops on [DONE] terminator', async () => {
    const body = encodeSSE([
      'data: {"choices":[{"delta":{"content":"part1"}}]}',
      'data: [DONE]',
      'data: {"choices":[{"delta":{"content":"part2"}}]}',
    ])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'tok',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { type: 'content', content: 'part1' },
    ])
  })

  it('uses default model when none provided', async () => {
    const body = encodeSSE(['data: [DONE]'])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'tok',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages)) {
      chunks.push(chunk)
    }

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.model).toBe('default')
  })

  it('uses config model when no override provided', async () => {
    const body = encodeSSE(['data: [DONE]'])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'tok',
      model: 'hermes-v2',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages)) {
      chunks.push(chunk)
    }

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.model).toBe('hermes-v2')
  })

  it('uses options model over config model', async () => {
    const body = encodeSSE(['data: [DONE]'])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'tok',
      model: 'hermes-v2',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages, { model: 'override-model' })) {
      chunks.push(chunk)
    }

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.model).toBe('override-model')
  })

  it('skips malformed JSON lines', async () => {
    const body = encodeSSE([
      'data: {"choices":[{"delta":{"content":"good"}}]}',
      'data: not-json',
      'data: {"choices":[{"delta":{"content":"also good"}}]}',
      'data: [DONE]',
    ])

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(body)
          controller.close()
        },
      }),
    })

    const config: HermesConfig = {
      gatewayUrl: 'https://hermes.example.com',
      authToken: 'tok',
    }

    const chunks = []
    for await (const chunk of hermesChatStream(config, messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { type: 'content', content: 'good' },
      { type: 'content', content: 'also good' },
    ])
  })
})
