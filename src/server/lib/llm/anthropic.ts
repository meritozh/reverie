import Anthropic from '@anthropic-ai/sdk'
import type { ProviderConfig, ChatMessage, StreamChunk, ChatOptions } from './types'

export class AnthropicProvider {
  private client: Anthropic
  private model: string

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey })
    this.model = config.model || 'claude-sonnet-4-20250514'
  }

  async *chatStream(messages: ChatMessage[], options: ChatOptions = {}): AsyncGenerator<StreamChunk> {
    const systemMessage = messages.find(m => m.role === 'system')
    const filteredMessages = messages.filter(m => m.role !== 'system')

    try {
      const stream = await this.client.messages.create({
        model: options.model || this.model,
        messages: filteredMessages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature,
        system: systemMessage?.content,
        stream: true
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'content', content: event.delta.text }
        }
      }

      yield { type: 'done' }
    } catch (error) {
      yield { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
