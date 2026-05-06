import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiProvider } from './gemini'
import type { ChatMessage } from './types'

const mockGenAI = {
  getGenerativeModel: vi.fn()
}

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn(function() {
      return mockGenAI
    })
  }
})

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should stream content chunks and yield done', async () => {
    const mockChunks = [
      { text: () => 'Hello' },
      { text: () => ' world' }
    ]
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield* mockChunks
      }
    }
    const mockResult = { stream: mockStream }
    const mockGenerateContentStream = vi.fn().mockResolvedValue(mockResult)
    const mockModel = { generateContentStream: mockGenerateContentStream }
    mockGenAI.getGenerativeModel.mockReturnValue(mockModel)

    const provider = new GeminiProvider({
      type: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-2.5-flash'
    })

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Say hello' }
    ]

    const chunks: string[] = []
    let doneYielded = false

    for await (const chunk of provider.chatStream(messages)) {
      if (chunk.type === 'content') {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      } else if (chunk.type === 'done') {
        doneYielded = true
      }
    }

    expect(chunks).toEqual(['Hello', ' world'])
    expect(doneYielded).toBe(true)
    expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash'
    })
    expect(mockGenerateContentStream).toHaveBeenCalledWith({
      contents: [
        { role: 'user', parts: [{ text: 'Say hello' }] }
      ]
    })
  })

  it('should extract system message and pass as systemInstruction', async () => {
    const mockStream = { async *[Symbol.asyncIterator]() {} }
    const mockResult = { stream: mockStream }
    const mockGenerateContentStream = vi.fn().mockResolvedValue(mockResult)
    const mockModel = { generateContentStream: mockGenerateContentStream }
    mockGenAI.getGenerativeModel.mockReturnValue(mockModel)

    const provider = new GeminiProvider({
      type: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-2.5-flash'
    })

    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' }
    ]

    for await (const _ of provider.chatStream(messages)) {}

    expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are a helpful assistant'
    })
    expect(mockGenerateContentStream).toHaveBeenCalledWith({
      contents: [
        { role: 'user', parts: [{ text: 'Hello' }] }
      ]
    })
  })

  it('should map assistant role to model', async () => {
    const mockStream = { async *[Symbol.asyncIterator]() {} }
    const mockResult = { stream: mockStream }
    const mockGenerateContentStream = vi.fn().mockResolvedValue(mockResult)
    const mockModel = { generateContentStream: mockGenerateContentStream }
    mockGenAI.getGenerativeModel.mockReturnValue(mockModel)

    const provider = new GeminiProvider({
      type: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-2.5-flash'
    })

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'user', content: 'How are you?' }
    ]

    for await (const _ of provider.chatStream(messages)) {}

    expect(mockGenerateContentStream).toHaveBeenCalledWith({
      contents: [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there' }] },
        { role: 'user', parts: [{ text: 'How are you?' }] }
      ]
    })
  })

  it('should handle errors', async () => {
    const mockError = new Error('API error')
    const mockGenerateContentStream = vi.fn().mockRejectedValue(mockError)
    const mockModel = { generateContentStream: mockGenerateContentStream }
    mockGenAI.getGenerativeModel.mockReturnValue(mockModel)

    const provider = new GeminiProvider({
      type: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-2.5-flash'
    })

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

    let errorChunk: any = null

    for await (const chunk of provider.chatStream(messages)) {
      if (chunk.type === 'error') {
        errorChunk = chunk
      }
    }

    expect(errorChunk).toEqual({ type: 'error', error: 'API error' })
  })

  it('should handle abort signal', async () => {
    const abortController = new AbortController()
    abortController.abort()

    const mockChunks = [
      { text: () => 'Hello' }
    ]
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield* mockChunks
      }
    }
    const mockResult = { stream: mockStream }
    const mockGenerateContentStream = vi.fn().mockResolvedValue(mockResult)
    const mockModel = { generateContentStream: mockGenerateContentStream }
    mockGenAI.getGenerativeModel.mockReturnValue(mockModel)

    const provider = new GeminiProvider({
      type: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-2.5-flash'
    })

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

    let doneYielded = false

    for await (const chunk of provider.chatStream(messages, { signal: abortController.signal })) {
      if (chunk.type === 'done') {
        doneYielded = true
      }
    }

    expect(doneYielded).toBe(true)
  })

  it('should skip empty text chunks', async () => {
    const mockChunks = [
      { text: () => '' },
      { text: () => 'Hello' },
      { text: () => null }
    ]
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield* mockChunks
      }
    }
    const mockResult = { stream: mockStream }
    const mockGenerateContentStream = vi.fn().mockResolvedValue(mockResult)
    const mockModel = { generateContentStream: mockGenerateContentStream }
    mockGenAI.getGenerativeModel.mockReturnValue(mockModel)

    const provider = new GeminiProvider({
      type: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-2.5-flash'
    })

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

    const chunks: string[] = []

    for await (const chunk of provider.chatStream(messages)) {
      if (chunk.type === 'content') {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      }
    }

    expect(chunks).toEqual(['Hello'])
    expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash'
    })
  })
})
