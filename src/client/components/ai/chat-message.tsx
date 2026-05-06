interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  streaming?: boolean
}

export function ChatMessage({ role, content, streaming }: ChatMessageProps) {
  const isUser = role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap max-w-[85%] ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {content}
        {streaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse" />
        )}
      </div>
    </div>
  )
}
