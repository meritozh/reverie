import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router"
import { getFile, updateFile } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { ChatPanel } from "@/components/ai/chat-panel"
import { PreviewFrame } from "@/components/preview/preview-frame"
import { ArrowLeft, Save, Bot } from "lucide-react"

export default function ComponentEditorPage() {
  const slug = useParams()["*"] ?? ""
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState("")
  const [dirty, setDirty] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [provider, setProvider] = useState("openai")
  const [previewProps, setPreviewProps] = useState("{}")

  let parsedProps: Record<string, unknown> = {}
  try {
    parsedProps = JSON.parse(previewProps)
  } catch {
    parsedProps = {}
  }

  useEffect(() => {
    setLoading(true)
    getFile(`components/${slug}.tsx`)
      .then((data) => {
        setCode(data.content)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [slug])

  const handleSave = useCallback(async () => {
    await updateFile(`components/${slug}.tsx`, code)
    setDirty(false)
  }, [code, slug])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleSave])

  if (loading) return <div className="p-4 text-muted-foreground">Loading...</div>

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {slug}.tsx
          {dirty && <span className="ml-1 text-orange-500">*</span>}
        </span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant={showChat ? "default" : "outline"}
          onClick={() => setShowChat(!showChat)}
        >
          <Bot className="h-4 w-4 mr-1" />
          AI
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!dirty}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={showChat ? 40 : 50} minSize={25}>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setDirty(true)
              }}
              className="w-full h-full resize-none bg-zinc-900 text-zinc-100 font-mono text-sm p-4 outline-none border-none focus:ring-0"
              spellCheck={false}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={showChat ? 20 : 50} minSize={20}>
            <div className="flex flex-col h-full">
              <div className="flex-1 bg-white">
                <PreviewFrame
                  file={`content/${slug}.tsx`}
                  props={parsedProps}
                />
              </div>
              <div className="border-t">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                  Props (JSON)
                </div>
                <textarea
                  value={previewProps}
                  onChange={(e) => setPreviewProps(e.target.value)}
                  className="w-full h-28 resize-none bg-zinc-900 text-zinc-100 font-mono text-xs p-3 outline-none border-none focus:ring-0"
                  spellCheck={false}
                  placeholder="{}"
                />
              </div>
            </div>
          </ResizablePanel>
          {showChat && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
                <ChatPanel
                  fileContext={code}
                  provider={provider}
                  onProviderChange={setProvider}
                  onClose={() => setShowChat(false)}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
