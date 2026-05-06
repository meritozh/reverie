import type { ProviderConfig, ChatMessage, StreamChunk, ChatOptions } from './types'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'

export interface LLMProvider {
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<StreamChunk>
}

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'zhipu':
      return new OpenAIProvider({
        ...config,
        baseURL: config.baseURL || 'https://open.bigmodel.cn/api/paas/v4',
      })
    case 'anthropic':
      return new AnthropicProvider(config)
    case 'gemini':
      return new GeminiProvider(config)
    default:
      throw new Error(`Unknown provider: ${(config as ProviderConfig).type}`)
  }
}
