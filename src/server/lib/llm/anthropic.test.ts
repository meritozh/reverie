// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { AnthropicProvider } from './anthropic'
import type { ChatMessage } from './types'

const mockCreate = vi.fn()
const mockStream = {
  [Symbol.asyncIterator]: async function* () {
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } }
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '!' } }
  }
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor() {}

    messages = {
      create: mockCreate
    }
  }
}))

describe('AnthropicProvider', () => {
  it('yields content chunks and done', async () => {
    mockCreate.mockResolvedValue(mockStream)
    const provider = new AnthropicProvider({ type: 'anthropic', apiKey: 'test-key', model: 'claude-3' })
    const messages: ChatMessage[] = [{ role: 'user', content: 'Say hello' }]

    const chunks: string[] = []
    let done = false

    for await (const chunk of provider.chatStream(messages)) {
      if (chunk.type === 'content') {
        chunks.push(chunk.content!)
      } else if (chunk.type === 'done') {
        done = true
      }
    }

    expect(chunks).toEqual(['Hello', ' world', '!'])
    expect(done).toBe(true)
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-3',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 4096,
      temperature: undefined,
      system: undefined,
      stream: true
    })
  })

  it('extracts system message and passes as system param', async () => {
    mockCreate.mockResolvedValue(mockStream)
    const provider = new AnthropicProvider({ type: 'anthropic', apiKey: 'test-key', model: 'claude-3' })
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Say hello' }
    ]

    for await (const _ of provider.chatStream(messages)) {
      break
    }

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-3',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 4096,
      temperature: undefined,
      system: 'You are helpful',
      stream: true
    })
  })

  it('handles API errors and yields error chunk', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'))
    const provider = new AnthropicProvider({ type: 'anthropic', apiKey: 'test-key', model: 'claude-3' })
    const messages: ChatMessage[] = [{ role: 'user', content: 'Say hello' }]

    const chunks: unknown[] = []

    for await (const chunk of provider.chatStream(messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual({ type: 'error', error: 'API Error' })
  })

  it('uses default model when not provided', async () => {
    mockCreate.mockResolvedValue(mockStream)
    const provider = new AnthropicProvider({ type: 'anthropic', apiKey: 'test-key', model: '' })
    const messages: ChatMessage[] = [{ role: 'user', content: 'Say hello' }]

    for await (const _ of provider.chatStream(messages)) {
      break
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514'
      })
    )
  })

  it('uses default max_tokens of 4096', async () => {
    mockCreate.mockResolvedValue(mockStream)
    const provider = new AnthropicProvider({ type: 'anthropic', apiKey: 'test-key', model: 'claude-3' })
    const messages: ChatMessage[] = [{ role: 'user', content: 'Say hello' }]

    for await (const _ of provider.chatStream(messages)) {
      break
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 4096
      })
    )
  })

  it('allows overriding max_tokens via options', async () => {
    mockCreate.mockResolvedValue(mockStream)
    const provider = new AnthropicProvider({ type: 'anthropic', apiKey: 'test-key', model: 'claude-3' })
    const messages: ChatMessage[] = [{ role: 'user', content: 'Say hello' }]

    for await (const _ of provider.chatStream(messages, { maxTokens: 1024 })) {
      break
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 1024
      })
    )
  })

  it('passes temperature when provided in options', async () => {
    mockCreate.mockResolvedValue(mockStream)
    const provider = new AnthropicProvider({ type: 'anthropic', apiKey: 'test-key', model: 'claude-3' })
    const messages: ChatMessage[] = [{ role: 'user', content: 'Say hello' }]

    for await (const _ of provider.chatStream(messages, { temperature: 0.7 })) {
      break
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.7
      })
    )
  })
})
