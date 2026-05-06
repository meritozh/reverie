import OpenAI from 'openai'
import type { ProviderConfig, ChatMessage, StreamChunk, ChatOptions } from './types'
import type { LLMProvider } from './provider'

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })
    this.model = config.model
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<StreamChunk> {
    const model = options?.model ?? this.model

    try {
      const stream = await this.client.chat.completions.create(
        {
          model,
          messages,
          stream: true,
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
          ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        },
        {
          signal: options?.signal ?? undefined,
        },
      )

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield { type: 'content', content }
        }
      }

      yield { type: 'done' }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        yield { type: 'done' }
        return
      }
      const message = err instanceof Error ? err.message : 'Unknown error'
      yield { type: 'error', error: message }
    }
  }
}
