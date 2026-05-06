import { Button } from "@/components/ui/button"

interface AIDiffPreviewProps {
  original: string
  replacement: string
  onAccept: () => void
  onReject: () => void
}

export function AIDiffPreview({ original, replacement, onAccept, onReject }: AIDiffPreviewProps) {
  return (
    <div className="bg-popover border shadow-lg rounded-lg p-3 max-w-md">
      <div className="text-xs text-muted-foreground mb-2">Review Changes</div>
      <div className="space-y-2 mb-3">
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded px-2 py-1 text-sm line-through whitespace-pre-wrap max-h-32 overflow-auto">
          {original}
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded px-2 py-1 text-sm whitespace-pre-wrap max-h-32 overflow-auto">
          {replacement}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onReject}>
          Reject
        </Button>
        <Button size="sm" onClick={onAccept}>
          Accept
        </Button>
      </div>
    </div>
  )
}
