interface PreviewFrameProps {
  file: string
  props?: Record<string, unknown>
  className?: string
}

export function PreviewFrame({ file, props, className }: PreviewFrameProps) {
  const params = new URLSearchParams({ file })
  if (props && Object.keys(props).length > 0) {
    params.set("props", JSON.stringify(props))
  }
  const src = `/preview.html?${params.toString()}`
  return (
    <iframe
      src={src}
      className={className ?? "w-full h-full border-0"}
      sandbox="allow-scripts allow-same-origin"
      title={`Preview: ${file}`}
    />
  )
}
