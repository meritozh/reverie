import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router"
import matter from "gray-matter"
import { getFile, updateFile } from "@/lib/api"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { ChatPanel } from "@/components/ai/chat-panel"
import { ArrowLeft, Save, Bot } from "lucide-react"

export default function EditorPage() {
  const slug = useParams()["*"] ?? ""
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [markdown, setMarkdown] = useState("")
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>({})
  const [dirty, setDirty] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [provider, setProvider] = useState("openai")

  useEffect(() => {
    setLoading(true)
    getFile(`${slug}.mdx`)
      .then((data) => {
        setFrontmatter(data.frontmatter)
        setMarkdown(data.content)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [slug])

  const handleSave = useCallback(async () => {
    const fullContent = matter.stringify(markdown, frontmatter)
    await updateFile(`${slug}.mdx`, fullContent)
    setDirty(false)
  }, [markdown, frontmatter, slug])

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

  const title = (frontmatter.title as string) ?? ""
  const date = (frontmatter.date as string) ?? ""
  const tagsStr = Array.isArray(frontmatter.tags)
    ? (frontmatter.tags as string[]).join(", ")
    : ""

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
        <span className="text-sm text-muted-foreground">{slug}.mdx</span>
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
      <div className="border-b px-4 py-2 flex items-center gap-4">
        <Input
          value={title}
          onChange={(e) => {
            setFrontmatter((prev) => ({ ...prev, title: e.target.value }))
            setDirty(true)
          }}
          placeholder="Title"
          className="font-semibold"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setFrontmatter((prev) => ({ ...prev, date: e.target.value }))
            setDirty(true)
          }}
          className="w-40"
        />
        <Input
          value={tagsStr}
          onChange={(e) => {
            const tags = e.target.value
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
            setFrontmatter((prev) => ({ ...prev, tags }))
            setDirty(true)
          }}
          placeholder="Tags (comma separated)"
          className="w-48"
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={showChat ? 60 : 100} minSize={30}>
            <div className="h-full overflow-auto">
              <TiptapEditor
                initialContent={markdown}
                onSave={(md) => {
                  setMarkdown(md)
                  setDirty(true)
                }}
                provider={provider}
                fileContext={markdown}
              />
            </div>
          </ResizablePanel>
          {showChat && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
                <ChatPanel
                  fileContext={markdown}
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
