import { useState, useEffect, useRef, useCallback } from "react"
import { useAIStream } from "@/lib/hooks/use-ai-stream"
import { fetchProviders, fetchHermesStatus } from "@/lib/ai-api"
import type { AIProvider } from "@/lib/ai-api"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Bot } from "lucide-react"

interface ChatPanelProps {
  fileContext?: string
  provider: string
  onProviderChange: (provider: string) => void
  onClose: () => void
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export function ChatPanel({ fileContext, provider, onProviderChange, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [hermesAvailable, setHermesAvailable] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { content, loading, error, sendChat, sendHermesChat, setContent } = useAIStream()

  useEffect(() => {
    Promise.all([
      fetchProviders().catch(() => [] as AIProvider[]),
      fetchHermesStatus().catch(() => false),
    ]).then(([provs, hermes]) => {
      setProviders(provs)
      setHermesAvailable(hermes)
    })
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, content])

  useEffect(() => {
    if (!loading && content) {
      setMessages((prev) => [...prev, { role: "assistant", content }])
      setContent("")
    }
  }, [loading, content, setContent])

  const handleSend = useCallback(
    (text: string) => {
      const userMessage: Message = { role: "user", content: text }
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)

      const chatMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      if (provider === "hermes") {
        sendHermesChat(chatMessages, { fileContext })
      } else {
        sendChat(chatMessages, provider, { fileContext })
      }
    },
    [messages, provider, fileContext, sendChat, sendHermesChat],
  )

  const configuredProviders = providers.filter((p) => p.configured)
  const allProviders = [
    ...configuredProviders,
    ...(hermesAvailable ? [{ type: "hermes", name: "Hermes Agent", configured: true }] : []),
  ]

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Bot className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">AI Assistant</span>
        <div className="flex-1" />
        {allProviders.length > 1 && (
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="text-xs bg-transparent border rounded px-1.5 py-0.5"
          >
            {allProviders.map((p) => (
              <option key={p.type} value={p.type}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-3 space-y-3">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && content && (
            <ChatMessage role="assistant" content={content} streaming />
          )}
          {loading && !content && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
              {error}
            </div>
          )}
          {messages.length === 0 && !loading && (
            <div className="text-xs text-muted-foreground text-center py-8">
              Ask anything about your document or get writing help.
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  )
}
