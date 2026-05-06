import { useState, useEffect, useCallback } from "react"
import { useEditor, EditorContent, Extension } from "@tiptap/react"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "@tiptap/markdown"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { common, createLowlight } from "lowlight"
import { useAIStream } from "@/lib/hooks/use-ai-stream"
import { Toolbar } from "./toolbar"
import "./editor-styles.css"

const lowlight = createLowlight(common)

interface TiptapEditorProps {
  initialContent: string
  onSave?: (markdown: string) => void
  onImageUpload?: (file: File) => Promise<string>
  provider?: string
  fileContext?: string
}

function createImageUploadExtension(onUpload: (file: File) => Promise<string>) {
  return Extension.create({
    name: "imageUpload",

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("imageUpload"),
          props: {
            handleDrop: (view, event) => {
              const files = event.dataTransfer?.files
              if (!files || files.length === 0) return false

              for (let i = 0; i < files.length; i++) {
                const file = files[i]
                if (!file.type.startsWith("image/")) continue

                event.preventDefault()
                const coordinates = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY,
                })

                onUpload(file).then((url) => {
                  const node = view.state.schema.nodes.image.create({ src: url })
                  const pos = coordinates?.pos ?? view.state.selection.from
                  const tr = view.state.tr.insert(pos, node)
                  view.dispatch(tr)
                })
                return true
              }
              return false
            },
            handlePaste: (view, event) => {
              const items = event.clipboardData?.items
              if (!items) return false

              for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (!item.type.startsWith("image/")) continue

                const file = item.getAsFile()
                if (!file) continue

                event.preventDefault()
                onUpload(file).then((url) => {
                  const node = view.state.schema.nodes.image.create({ src: url })
                  const tr = view.state.tr.insert(view.state.selection.from, node)
                  view.dispatch(tr)
                })
                return true
              }
              return false
            },
          },
        }),
      ]
    },
  })
}

export function TiptapEditor({ initialContent, onImageUpload, provider, fileContext }: TiptapEditorProps) {
  const extensions = [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3] },
    }),
    Markdown,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "plaintext",
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Link.configure({
      openOnClick: false,
    }),
    Placeholder.configure({
      placeholder: "Start writing...",
    }),
  ]

  if (onImageUpload) {
    extensions.push(createImageUploadExtension(onImageUpload))
  }

  const editor = useEditor({
    extensions,
    content: initialContent,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base focus:outline-none max-w-none min-h-[300px] px-4 py-3",
      },
    },
  })

  const {
    content: aiContent,
    loading: aiLoading,
    error: aiError,
    sendComplete,
    setContent: setAiContent,
  } = useAIStream()

  const [pendingSelection, setPendingSelection] = useState<{
    from: number
    to: number
  } | null>(null)

  useEffect(() => {
    if (!aiLoading && aiContent && pendingSelection && editor) {
      const { from, to } = pendingSelection
      editor.chain().focus().deleteRange({ from, to }).insertContent(aiContent).run()
      setPendingSelection(null)
      setAiContent("")
    }
  }, [aiLoading, aiContent, pendingSelection, editor, setAiContent])

  const handleAIAction = useCallback(
    (action: string) => {
      if (!editor) return
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to, "\n")
      if (!text) return
      setPendingSelection({ from, to })
      sendComplete(text, action, provider || "openai", { fileContext })
    },
    [editor, provider, fileContext, sendComplete],
  )

  return (
    <div className="border rounded-md relative">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
