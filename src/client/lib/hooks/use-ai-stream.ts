import { useState, useCallback, useRef, useEffect } from 'react'
import { streamChat, streamComplete, streamHermesChat } from '../ai-api'

export function useAIStream() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  const sendChat = useCallback(async (
    messages: { role: string; content: string }[],
    provider: string,
    options?: { model?: string; fileContext?: string }
  ) => {
    abort()
    const controller = new AbortController()
    abortRef.current = controller
    setContent('')
    setError(null)
    setLoading(true)

    try {
      await streamChat(messages, provider, {
        onChunk: (c) => setContent(prev => prev + c),
        onError: (e) => { setError(e); setLoading(false) },
        onDone: () => setLoading(false),
      }, { ...options, signal: controller.signal })
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
      setLoading(false)
    }
  }, [abort])

  const sendComplete = useCallback(async (
    text: string,
    action: string,
    provider: string,
    options?: { model?: string; fileContext?: string; language?: string }
  ) => {
    abort()
    const controller = new AbortController()
    abortRef.current = controller
    setContent('')
    setError(null)
    setLoading(true)

    try {
      await streamComplete(text, action, provider, {
        onChunk: (c) => setContent(prev => prev + c),
        onError: (e) => { setError(e); setLoading(false) },
        onDone: () => setLoading(false),
      }, { ...options, signal: controller.signal })
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
      setLoading(false)
    }
  }, [abort])

  const sendHermesChat = useCallback(async (
    messages: { role: string; content: string }[],
    options?: { model?: string; fileContext?: string }
  ) => {
    abort()
    const controller = new AbortController()
    abortRef.current = controller
    setContent('')
    setError(null)
    setLoading(true)

    try {
      await streamHermesChat(messages, {
        onChunk: (c) => setContent(prev => prev + c),
        onError: (e) => { setError(e); setLoading(false) },
        onDone: () => setLoading(false),
      }, { ...options, signal: controller.signal })
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
      setLoading(false)
    }
  }, [abort])

  useEffect(() => () => abort(), [abort])

  return { content, loading, error, abort, sendChat, sendComplete, sendHermesChat, setContent }
}
