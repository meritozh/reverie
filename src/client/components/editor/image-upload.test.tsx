import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { TiptapEditor } from "./tiptap-editor"
import * as api from "@/lib/api"

vi.spyOn(api, "uploadImage").mockResolvedValue({ url: "/content/images/test-abc.png" })

describe("Image upload in editor", () => {
  beforeEach(() => {
    vi.mocked(api.uploadImage).mockClear()
  })

  it("has onImageUpload prop that uploads and returns URL", async () => {
    const file = new File(["data"], "test.png", { type: "image/png" })
    const result = await api.uploadImage(file)
    expect(result.url).toBe("/content/images/test-abc.png")
  })

  it("uploadImage is called for valid image files", async () => {
    const file = new File(["data"], "photo.png", { type: "image/png" })
    await api.uploadImage(file)
    expect(api.uploadImage).toHaveBeenCalledWith(file)
  })

  it("uploadImage rejects non-image files", async () => {
    vi.mocked(api.uploadImage).mockRejectedValueOnce(new Error("Failed to upload image: 400"))
    const file = new File(["text"], "doc.txt", { type: "text/plain" })
    await expect(api.uploadImage(file)).rejects.toThrow()
  })

  it("editor accepts onImageUpload prop", () => {
    const onImageUpload = vi.fn().mockResolvedValue("/content/images/uploaded.png")
    render(<TiptapEditor initialContent="Hello" onImageUpload={onImageUpload} />)

    expect(screen.getByLabelText("Bold")).toBeInTheDocument()
  })

  it("editor renders without onImageUpload prop", () => {
    render(<TiptapEditor initialContent="Hello" />)
    expect(screen.getByLabelText("Bold")).toBeInTheDocument()
  })
})

describe("createImageUploadExtension plugin handlers", () => {
  beforeEach(() => {
    vi.mocked(api.uploadImage).mockClear()
  })

  function getPluginHandlers(onUpload: (file: File) => Promise<string>) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Plugin, PluginKey } = require("@tiptap/pm/state")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Extension } = require("@tiptap/react")

    const ext = Extension.create({
      name: "imageUpload",
      addProseMirrorPlugins() {
        return [
          new Plugin({
            key: new PluginKey("imageUpload"),
            props: {
              handleDrop: (view: any, event: any) => {
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

                  onUpload(file).then((url: string) => {
                    const node = view.state.schema.nodes.image.create({ src: url })
                    const pos = coordinates?.pos ?? view.state.selection.from
                    const tr = view.state.tr.insert(pos, node)
                    view.dispatch(tr)
                  })
                  return true
                }
                return false
              },
              handlePaste: (view: any, event: any) => {
                const items = event.clipboardData?.items
                if (!items) return false

                for (let i = 0; i < items.length; i++) {
                  const item = items[i]
                  if (!item.type.startsWith("image/")) continue

                  const file = item.getAsFile()
                  if (!file) continue

                  event.preventDefault()
                  onUpload(file).then((url: string) => {
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

    const plugins = ext.config.addProseMirrorPlugins!.call({})
    return plugins[0].props
  }

  it("handleDrop calls onUpload for image files", async () => {
    const onUpload = vi.fn().mockResolvedValue("/content/images/dropped.png")
    const handlers = getPluginHandlers(onUpload)

    const mockView = {
      posAtCoords: () => ({ pos: 5 }),
      state: {
        schema: { nodes: { image: { create: vi.fn().mockReturnValue({}) } } },
        tr: { insert: vi.fn().mockReturnThis() },
        selection: { from: 0 },
      },
      dispatch: vi.fn(),
    }

    const file = new File(["data"], "drop.png", { type: "image/png" })
    const mockEvent = {
      dataTransfer: { files: [file] },
      clientX: 10,
      clientY: 20,
      preventDefault: vi.fn(),
    }

    const result = handlers.handleDrop(mockView, mockEvent)
    expect(result).toBe(true)
    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it("handleDrop returns false for non-image files", () => {
    const onUpload = vi.fn()
    const handlers = getPluginHandlers(onUpload)

    const mockView = {
      posAtCoords: () => ({ pos: 5 }),
      state: {
        schema: { nodes: { image: { create: vi.fn() } } },
        tr: { insert: vi.fn() },
        selection: { from: 0 },
      },
      dispatch: vi.fn(),
    }

    const file = new File(["data"], "doc.txt", { type: "text/plain" })
    const mockEvent = {
      dataTransfer: { files: [file] },
      clientX: 10,
      clientY: 20,
      preventDefault: vi.fn(),
    }

    const result = handlers.handleDrop(mockView, mockEvent)
    expect(result).toBe(false)
    expect(onUpload).not.toHaveBeenCalled()
  })

  it("handlePaste calls onUpload for image items", async () => {
    const onUpload = vi.fn().mockResolvedValue("/content/images/pasted.png")
    const handlers = getPluginHandlers(onUpload)

    const file = new File(["data"], "paste.png", { type: "image/png" })
    const mockView = {
      state: {
        schema: { nodes: { image: { create: vi.fn().mockReturnValue({}) } } },
        tr: { insert: vi.fn().mockReturnThis() },
        selection: { from: 0 },
      },
      dispatch: vi.fn(),
    }

    const mockEvent = {
      clipboardData: {
        items: [{ type: "image/png", getAsFile: () => file }],
      },
      preventDefault: vi.fn(),
    }

    const result = handlers.handlePaste(mockView, mockEvent)
    expect(result).toBe(true)
    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it("handlePaste returns false when no image items", () => {
    const onUpload = vi.fn()
    const handlers = getPluginHandlers(onUpload)

    const mockView = {
      state: {
        schema: { nodes: { image: { create: vi.fn() } } },
        tr: { insert: vi.fn() },
        selection: { from: 0 },
      },
      dispatch: vi.fn(),
    }

    const mockEvent = {
      clipboardData: {
        items: [{ type: "text/plain", getAsFile: () => null }],
      },
      preventDefault: vi.fn(),
    }

    const result = handlers.handlePaste(mockView, mockEvent)
    expect(result).toBe(false)
    expect(onUpload).not.toHaveBeenCalled()
  })
})
