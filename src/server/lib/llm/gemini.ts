import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ProviderConfig, ChatMessage, StreamChunk, ChatOptions } from './types'

export class GeminiProvider {
  private genAI: GoogleGenerativeAI
  private model: string

  constructor(config: ProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey)
    this.model = config.model || 'gemini-2.5-flash'
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
    try {
      const systemInstruction = this.extractSystemMessage(messages)
      const modelConfig: any = {
        model: options?.model || this.model
      }
      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction
      }

      const model = this.genAI.getGenerativeModel(modelConfig)
      const geminiMessages = this.convertToGeminiFormat(messages)

      const result = await model.generateContentStream({
        contents: geminiMessages
      })

      for await (const chunk of result.stream) {
        if (options?.signal?.aborted) {
          break
        }

        const text = chunk.text()
        if (text) {
          yield { type: 'content', content: text }
        }
      }

      yield { type: 'done' }
    } catch (error) {
      yield { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private extractSystemMessage(messages: ChatMessage[]): string | undefined {
    const systemMessage = messages.find(msg => msg.role === 'system')
    return systemMessage?.content
  }

  private convertToGeminiFormat(messages: ChatMessage[]) {
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
  }
}
