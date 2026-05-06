const AI_ACTIONS = [
  { action: "continue", label: "Continue" },
  { action: "rewrite", label: "Improve" },
  { action: "translate", label: "Translate" },
  { action: "summarize", label: "Summarize" },
  { action: "fix-grammar", label: "Fix grammar" },
  { action: "change-tone", label: "Change tone" },
] as const

interface AIActionMenuProps {
  onSelectAction: (action: string) => void
  loading?: boolean
  error?: string | null
}

export function AIActionMenu({ onSelectAction, loading = false, error = null }: AIActionMenuProps) {
  return (
    <div className="bg-popover/95 backdrop-blur-sm border shadow-lg rounded-lg p-1">
      <div className="flex gap-1">
        {AI_ACTIONS.map(({ action, label }) => (
          <button
            key={action}
            onClick={() => onSelectAction(action)}
            disabled={loading}
            className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
        {loading && (
          <span className="inline-block animate-spin text-xs self-center" aria-label="Loading">
            ⏳
          </span>
        )}
      </div>
      {error && <div className="text-xs text-destructive mt-1 px-2">{error}</div>}
    </div>
  )
}
