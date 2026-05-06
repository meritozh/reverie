import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { hermesChatStream } from '../lib/hermes'
import type { HermesConfig } from '../lib/hermes'
import type { ChatMessage, StreamChunk } from '../lib/llm'

export type { HermesConfig }

export function createHermesRouter(getConfig: () => HermesConfig | null) {
  const app = new Hono()

  app.get('/status', (c) => {
    const config = getConfig()
    return c.json({ configured: config !== null })
  })

  app.post('/chat', async (c) => {
    const config = getConfig()
    if (!config) return c.json({ error: 'Hermes not configured' }, 400)

    const body = await c.req.json<{
      messages?: ChatMessage[]
      model?: string
      fileContext?: string
    }>()

    let messages = body.messages ?? []

    if (body.fileContext) {
      messages = [
        {
          role: 'system',
          content: `You are an AI assistant. The user is editing:\n\n${body.fileContext}`,
        },
        ...messages,
      ]
    }

    return streamSSE(c, async (stream) => {
      try {
        for await (const chunk of hermesChatStream(config, messages, { model: body.model })) {
          await stream.writeSSE({
            event: 'chunk',
            data: JSON.stringify(chunk),
          })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Stream error'
        await stream.writeSSE({
          event: 'chunk',
          data: JSON.stringify({ type: 'error', error: errorMessage } satisfies StreamChunk),
        })
      } finally {
        await stream.writeSSE({
          event: 'done',
          data: '{}',
        })
      }
    })
  })

  return app
}
