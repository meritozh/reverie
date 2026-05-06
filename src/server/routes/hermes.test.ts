import { describe, it, expect, vi } from 'vitest'
import { createHermesRouter } from './hermes'
import type { HermesConfig } from '../lib/hermes'
import type { ChatMessage, StreamChunk } from '../lib/llm'

vi.mock('../lib/hermes', () => ({
  hermesChatStream: vi.fn(),
}))

import { hermesChatStream } from '../lib/hermes'

const mockHermesChatStream = vi.mocked(hermesChatStream)

function createMockStream(chunks: StreamChunk[]) {
  return async function* () {
    for (const chunk of chunks) {
      yield chunk
    }
  }
}

function parseSSE(raw: string) {
  const events: { event: string; data: string }[] = []
  const lines = raw.split('\n')
  let current: { event: string; data: string } | null = null

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      current = { event: line.slice(7), data: '' }
    } else if (line.startsWith('data: ') && current) {
      current.data = line.slice(6)
      events.push(current)
      current = null
    }
  }
  return events
}

const validConfig: HermesConfig = {
  gatewayUrl: 'https://hermes.example.com',
  authToken: 'test-token',
}

describe('GET /status', () => {
  it('returns configured:true when config exists', async () => {
    const app = createHermesRouter(() => validConfig)
    const res = await app.request('/status')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.configured).toBe(true)
  })

  it('returns configured:false when config is null', async () => {
    const app = createHermesRouter(() => null)
    const res = await app.request('/status')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.configured).toBe(false)
  })
})

describe('POST /chat', () => {
  it('returns 400 when not configured', async () => {
    const app = createHermesRouter(() => null)
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Hermes not configured')
  })

  it('streams SSE content chunks', async () => {
    mockHermesChatStream.mockImplementation(
      createMockStream([
        { type: 'content', content: 'Hello ' },
        { type: 'content', content: 'world' },
      ]),
    )

    const app = createHermesRouter(() => validConfig)
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })

    expect(res.status).toBe(200)

    const raw = await res.text()
    const events = parseSSE(raw)

    const contentEvents = events.filter((e) => e.event === 'chunk')
    expect(contentEvents.length).toBeGreaterThanOrEqual(2)

    const first = JSON.parse(contentEvents[0].data)
    expect(first.type).toBe('content')
    expect(first.content).toBe('Hello ')

    const doneEvents = events.filter((e) => e.event === 'done')
    expect(doneEvents).toHaveLength(1)
    expect(doneEvents[0].data).toBe('{}')
  })

  it('prepends fileContext as system message', async () => {
    const captured: { messages: ChatMessage[]; model?: string }[] = []

    mockHermesChatStream.mockImplementation(function* (_config, messages, options) {
      captured.push({ messages, model: options?.model })
      return
    })

    const app = createHermesRouter(() => validConfig)
    await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'edit this' }],
        fileContext: 'my-document.mdx',
      }),
    })

    expect(captured).toHaveLength(1)
    expect(captured[0].messages[0].role).toBe('system')
    expect(captured[0].messages[0].content).toContain('my-document.mdx')
    expect(captured[0].messages[1]).toEqual({ role: 'user', content: 'edit this' })
  })

  it('handles stream error gracefully', async () => {
    mockHermesChatStream.mockImplementation(async function* () {
      throw new Error('Connection lost')
    })

    const app = createHermesRouter(() => validConfig)
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })

    const raw = await res.text()
    const events = parseSSE(raw)

    const errorChunks = events.filter(
      (e) => e.event === 'chunk' && JSON.parse(e.data).type === 'error',
    )
    expect(errorChunks.length).toBeGreaterThan(0)
    expect(JSON.parse(errorChunks[0].data).error).toBe('Connection lost')

    const doneEvents = events.filter((e) => e.event === 'done')
    expect(doneEvents).toHaveLength(1)
  })

  it('passes model option to hermesChatStream', async () => {
    const captured: { model?: string }[] = []

    mockHermesChatStream.mockImplementation(function* (_config, _messages, options) {
      captured.push({ model: options?.model })
      return
    })

    const app = createHermesRouter(() => validConfig)
    await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'hermes-v3',
      }),
    })

    expect(captured[0].model).toBe('hermes-v3')
  })
})
