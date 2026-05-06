import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router"
import * as api from "@/lib/api"

vi.mock("@/components/preview/preview-frame", () => ({
  PreviewFrame: ({ file }: { file: string }) => (
    <div data-testid="preview-frame">{file}</div>
  ),
}))

vi.mock("@/components/ai/chat-panel", () => ({
  ChatPanel: ({ fileContext, onClose }: { fileContext: string; onClose: () => void }) => (
    <div data-testid="chat-panel">
      <button onClick={onClose}>Close</button>
      <div>{fileContext}</div>
    </div>
  ),
}))

vi.mock("@/lib/hooks/use-ai-stream", () => ({
  useAIStream: () => ({
    messages: [],
    sendMessage: vi.fn(),
    isLoading: false,
  }),
}))

import ComponentEditorPage from "./component-editor"

const mockGetFile = vi.spyOn(api, "getFile")
const mockUpdateFile = vi.spyOn(api, "updateFile")

const mockFileContent = `export default function TestComponent() {
  return <div>Test</div>
}`

function renderComponentEditor(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/component-editor/*" element={<ComponentEditorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("ComponentEditorPage", () => {
  beforeEach(() => {
    mockGetFile.mockResolvedValue({ content: mockFileContent, frontmatter: {} })
    mockUpdateFile.mockResolvedValue(undefined)
  })

  it("loads file content via getFile on mount", async () => {
    renderComponentEditor("/component-editor/test-component")
    await waitFor(() => {
      expect(mockGetFile).toHaveBeenCalledWith("components/test-component.tsx")
    })
  })

  it("shows the filename in the toolbar", async () => {
    renderComponentEditor("/component-editor/test-component")
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return !!(element?.classList.contains("text-sm") &&
               element?.classList.contains("text-muted-foreground") &&
               content.includes("test-component.tsx"))
      })).toBeInTheDocument()
    })
  })

  it("shows dirty indicator (*) after editing code", async () => {
    renderComponentEditor("/component-editor/test-component")
    await waitFor(() => {
      expect(mockGetFile).toHaveBeenCalled()
    })

    const textareas = screen.getAllByRole("textbox")
    const codeTextarea = textareas.find((ta) =>
      ta.classList.contains("bg-zinc-900")
    )
    expect(codeTextarea).toBeInTheDocument()

    const newValue = mockFileContent + "\n// new line"
    codeTextarea!.dispatchEvent(new Event("change", { bubbles: true }))
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(codeTextarea, newValue)
    codeTextarea!.dispatchEvent(new Event("input", { bubbles: true }))

    await waitFor(() => {
      expect(screen.getByText("*")).toBeInTheDocument()
    })
  })

  it("calls updateFile on Ctrl+S", async () => {
    renderComponentEditor("/component-editor/test-component")
    await waitFor(() => {
      expect(mockGetFile).toHaveBeenCalled()
    })

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true })
    )

    await waitFor(() => {
      expect(mockUpdateFile).toHaveBeenCalledWith("components/test-component.tsx", mockFileContent)
    })
  })

  it("toggles AI chat panel when AI button is clicked", async () => {
    renderComponentEditor("/component-editor/test-component")
    await waitFor(() => {
      expect(mockGetFile).toHaveBeenCalled()
    })

    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument()

    const aiButton = screen.getByRole("button", { name: /ai/i })
    aiButton.click()

    await waitFor(() => {
      expect(screen.getByTestId("chat-panel")).toBeInTheDocument()
    })

    aiButton.click()

    await waitFor(() => {
      expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument()
    })
  })

  it("shows the props textarea with default {}", async () => {
    renderComponentEditor("/component-editor/test-component")
    await waitFor(() => {
      expect(mockGetFile).toHaveBeenCalled()
    })

    const propsTextarea = screen.getAllByRole("textbox").find(
      (el) => el.getAttribute("placeholder") === "{}"
    )
    expect(propsTextarea).toBeInTheDocument()
    expect(propsTextarea).toHaveValue("{}")
  })

  it("renders back navigation button", async () => {
    renderComponentEditor("/component-editor/test-component")
    await waitFor(() => {
      expect(screen.getByTitle("Back")).toBeInTheDocument()
    })
  })
})
