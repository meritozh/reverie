import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIStream } from './use-ai-stream'

vi.mock('../ai-api', () => ({
  streamChat: vi.fn(),
  streamComplete: vi.fn(),
  streamHermesChat: vi.fn(),
}))

import { streamChat, streamComplete, streamHermesChat } from '../ai-api'
const mockStreamChat = vi.mocked(streamChat)
const mockStreamComplete = vi.mocked(streamComplete)
const mockStreamHermesChat = vi.mocked(streamHermesChat)

describe('useAIStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const { result } = renderHook(() => useAIStream())
    expect(result.current.content).toBe('')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sendChat updates content progressively', async () => {
    mockStreamChat.mockImplementation(async (_msgs, _provider, callbacks, _opts) => {
      callbacks.onChunk('Hello ')
      callbacks.onChunk('world')
      callbacks.onDone()
    })

    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      await result.current.sendChat([{ role: 'user', content: 'hi' }], 'openai')
    })

    expect(result.current.content).toBe('Hello world')
  })

  it('sendChat sets loading during streaming and clears after', async () => {
    mockStreamChat.mockImplementation(async (_msgs, _provider, callbacks, _opts) => {
      callbacks.onChunk('data')
      callbacks.onDone()
    })

    const { result } = renderHook(() => useAIStream())

    expect(result.current.loading).toBe(false)

    await act(async () => {
      await result.current.sendChat([{ role: 'user', content: 'hi' }], 'openai')
    })

    expect(result.current.loading).toBe(false)
  })

  it('sendComplete updates content', async () => {
    mockStreamComplete.mockImplementation(async (_text, _action, _provider, callbacks, _opts) => {
      callbacks.onChunk('completed ')
      callbacks.onChunk('text')
      callbacks.onDone()
    })

    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      await result.current.sendComplete('some text', 'summarize', 'openai')
    })

    expect(result.current.content).toBe('completed text')
  })

  it('sendHermesChat updates content progressively', async () => {
    mockStreamHermesChat.mockImplementation(async (_msgs, callbacks, _opts) => {
      callbacks.onChunk('Hermes ')
      callbacks.onChunk('response')
      callbacks.onDone()
    })

    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      await result.current.sendHermesChat([{ role: 'user', content: 'hi' }])
    })

    expect(result.current.content).toBe('Hermes response')
  })

  it('abort stops streaming and sets loading false', async () => {
    mockStreamChat.mockImplementation(async (_msgs, _provider, _callbacks, opts) => {
      opts?.signal?.throwIfAborted()
    })

    const { result } = renderHook(() => useAIStream())

    act(() => {
      result.current.abort()
    })

    expect(result.current.loading).toBe(false)
  })

  it('sets error state on onError callback', async () => {
    mockStreamChat.mockImplementation(async (_msgs, _provider, callbacks, _opts) => {
      callbacks.onError('Something went wrong')
    })

    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      await result.current.sendChat([{ role: 'user', content: 'hi' }], 'openai')
    })

    expect(result.current.error).toBe('Something went wrong')
  })

  it('sets error on thrown exception', async () => {
    mockStreamChat.mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      await result.current.sendChat([{ role: 'user', content: 'hi' }], 'openai')
    })

    expect(result.current.error).toBe('Network failure')
    expect(result.current.loading).toBe(false)
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useAIStream())
    unmount()
  })
})
