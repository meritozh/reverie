export type ProviderType = "openai" | "anthropic" | "zhipu" | "gemini"

export interface ProviderConfig {
  type: ProviderType
  apiKey: string
  model: string
  baseURL?: string
}

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface StreamChunk {
  type: "content" | "error" | "done"
  content?: string
  error?: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface CompletionRequest {
  text: string
  action: "continue" | "rewrite" | "translate" | "summarize" | "fix-grammar" | "change-tone"
  provider: ProviderType
  model?: string
  fileContext?: string
  language?: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  provider: ProviderType
  model?: string
  fileContext?: string
}
