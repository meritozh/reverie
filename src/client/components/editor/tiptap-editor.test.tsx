import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TiptapEditor } from "./tiptap-editor"
import { Toolbar } from "./toolbar"

describe("TiptapEditor", () => {
  it("renders editor with toolbar", () => {
    render(<TiptapEditor initialContent="# Hello World" />)

    expect(screen.getByLabelText("Bold")).toBeInTheDocument()
    expect(screen.getByLabelText("Italic")).toBeInTheDocument()
    expect(screen.getByLabelText("Heading 1")).toBeInTheDocument()
    expect(screen.getByLabelText("Heading 2")).toBeInTheDocument()
    expect(screen.getByLabelText("Code block")).toBeInTheDocument()
    expect(screen.getByLabelText("Bullet list")).toBeInTheDocument()
  })

  it("renders initial markdown content", () => {
    render(<TiptapEditor initialContent="Hello **world**" />)
    expect(document.querySelector(".tiptap")).toBeInTheDocument()
  })
})

function createMockEditor(overrides: { activeStates?: Record<string, boolean> } = {}) {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    setImage: vi.fn().mockReturnThis(),
    undo: vi.fn().mockReturnThis(),
    redo: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  }

  return {
    chain: vi.fn().mockReturnValue(chain),
    isActive: (name: string, _attrs?: Record<string, unknown>) => {
      return overrides.activeStates?.[name] ?? false
    },
    _chain: chain,
  }
}

describe("Toolbar", () => {
  it("shows active class on bold button when bold is active", () => {
    const editor = createMockEditor({ activeStates: { bold: true } })
    render(<Toolbar editor={editor as unknown as Parameters<typeof Toolbar>[0]["editor"]} />)

    const boldButton = screen.getByLabelText("Bold")
    expect(boldButton).toHaveClass("is-active")
  })

  it("does not show active class on bold button when bold is inactive", () => {
    const editor = createMockEditor()
    render(<Toolbar editor={editor as unknown as Parameters<typeof Toolbar>[0]["editor"]} />)

    const boldButton = screen.getByLabelText("Bold")
    expect(boldButton).not.toHaveClass("is-active")
  })

  it("calls toggleBold on bold button click", async () => {
    const user = userEvent.setup()
    const editor = createMockEditor()
    render(<Toolbar editor={editor as unknown as Parameters<typeof Toolbar>[0]["editor"]} />)

    await user.click(screen.getByLabelText("Bold"))
    expect(editor.chain).toHaveBeenCalled()
    expect(editor._chain.toggleBold).toHaveBeenCalled()
  })

  it("calls toggleHeading on heading button click", async () => {
    const user = userEvent.setup()
    const editor = createMockEditor()
    render(<Toolbar editor={editor as unknown as Parameters<typeof Toolbar>[0]["editor"]} />)

    await user.click(screen.getByLabelText("Heading 1"))
    expect(editor._chain.toggleHeading).toHaveBeenCalledWith({ level: 1 })
  })

  it("shows active class on heading button when heading is active", () => {
    const editor = createMockEditor({ activeStates: { "heading": true } })
    render(<Toolbar editor={editor as unknown as Parameters<typeof Toolbar>[0]["editor"]} />)

    expect(screen.getByLabelText("Heading 1")).toHaveClass("is-active")
  })
})
