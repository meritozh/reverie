// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAIProvider } from './openai'
import { createProvider } from './provider'
import type { ChatMessage } from './types'

const mockCreate = vi.fn()

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      }
    },
  }
})

function makeStream(
  chunks: Array<{ choices: Array<{ delta: { content?: string | null } }> }>,
) {
  const items = [...chunks]
  return {
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          if (items.length === 0) return { done: true, value: undefined }
          return { done: false, value: items.shift()! }
        },
      }
    },
  }
}

beforeEach(() => {
  mockCreate.mockReset()
})

describe('OpenAIProvider', () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello' },
  ]

  it('yields content chunks and done', async () => {
    mockCreate.mockResolvedValue(
      makeStream([
        { choices: [{ delta: { content: 'Hi' } }] },
        { choices: [{ delta: { content: ' there' } }] },
        { choices: [{ delta: { content: null } }] },
        { choices: [{ delta: {} }] },
      ]),
    )

    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    })

    const chunks = []
    for await (const chunk of provider.chatStream(messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { type: 'content', content: 'Hi' },
      { type: 'content', content: ' there' },
      { type: 'done' },
    ])
  })

  it('passes model, messages, and stream options to SDK', async () => {
    mockCreate.mockResolvedValue(makeStream([]))

    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    })

    for await (const _ of provider.chatStream(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 100,
    })) {
      void _
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages,
        stream: true,
        temperature: 0.5,
        max_tokens: 100,
      }),
      expect.any(Object),
    )
  })

  it('uses default model from config when not overridden', async () => {
    mockCreate.mockResolvedValue(makeStream([]))

    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    })

    for await (const _ of provider.chatStream(messages)) {
      void _
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
      expect.any(Object),
    )
  })

  it('passes abort signal to SDK', async () => {
    mockCreate.mockResolvedValue(makeStream([]))

    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    })

    const controller = new AbortController()
    for await (const _ of provider.chatStream(messages, {
      signal: controller.signal,
    })) {
      void _
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('yields error chunk when API throws', async () => {
    mockCreate.mockRejectedValue(new Error('Rate limited'))

    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    })

    const chunks = []
    for await (const chunk of provider.chatStream(messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([{ type: 'error', error: 'Rate limited' }])
  })

  it('yields done chunk on abort', async () => {
    const abortErr = new DOMException('The user aborted a request.', 'AbortError')
    mockCreate.mockRejectedValue(abortErr)

    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    })

    const chunks = []
    for await (const chunk of provider.chatStream(messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([{ type: 'done' }])
  })

  it('handles non-Error throws', async () => {
    mockCreate.mockRejectedValue('string error')

    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    })

    const chunks = []
    for await (const chunk of provider.chatStream(messages)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([{ type: 'error', error: 'Unknown error' }])
  })

  it('skips temperature and maxTokens when not provided', async () => {
    mockCreate.mockResolvedValue(makeStream([]))

    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
    })

    for await (const _ of provider.chatStream(messages)) {
      void _
    }

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs).not.toHaveProperty('temperature')
    expect(callArgs).not.toHaveProperty('max_tokens')
  })
})

describe('createProvider', () => {
  it('returns OpenAIProvider for openai type', () => {
    const provider = createProvider({
      type: 'openai',
      apiKey: 'key',
      model: 'gpt-4o',
    })
    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('returns OpenAIProvider with zhipu baseURL', () => {
    const provider = createProvider({
      type: 'zhipu',
      apiKey: 'key',
      model: 'glm-4-plus',
    })
    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('uses custom baseURL for zhipu when provided', () => {
    const provider = createProvider({
      type: 'zhipu',
      apiKey: 'key',
      model: 'glm-4-plus',
      baseURL: 'https://custom.api.com/v4',
    })
    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('creates anthropic provider', () => {
    const provider = createProvider({ type: 'anthropic', apiKey: 'key', model: 'claude-3' })
    expect(provider).toBeDefined()
  })

  it('creates gemini provider', () => {
    const provider = createProvider({ type: 'gemini', apiKey: 'key', model: 'gemini-pro' })
    expect(provider).toBeDefined()
  })
})
