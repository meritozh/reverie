import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router"
import * as api from "@/lib/api"

vi.mock("@/components/editor/tiptap-editor", () => ({
  TiptapEditor: ({ initialContent }: { initialContent: string }) => (
    <div data-testid="tiptap-editor">{initialContent}</div>
  ),
}))

import EditorPage from "./editor"

const mockGetFile = vi.spyOn(api, "getFile")
const mockUpdateFile = vi.spyOn(api, "updateFile")

const mockFileDetail: api.FileDetail = {
  content: "## Welcome\n\nThis is the content.",
  frontmatter: {
    title: "Test Post",
    date: "2026-05-04",
    tags: ["test"],
    status: "draft",
  },
}

function renderEditor(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/editor/*" element={<EditorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("EditorPage", () => {
  beforeEach(() => {
    mockGetFile.mockResolvedValue(mockFileDetail)
    mockUpdateFile.mockResolvedValue(undefined)
  })

  it("loads file content via getFile on mount", async () => {
    renderEditor("/editor/posts/test")
    await waitFor(() => {
      expect(mockGetFile).toHaveBeenCalledWith("posts/test.mdx")
    })
  })

  it("shows frontmatter title in form field", async () => {
    renderEditor("/editor/posts/test")
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Post")).toBeInTheDocument()
    })
  })

  it("renders back navigation button", async () => {
    renderEditor("/editor/posts/test")
    await waitFor(() => {
      expect(screen.getByTitle("Back")).toBeInTheDocument()
    })
  })

  it("shows the filename in the toolbar", async () => {
    renderEditor("/editor/posts/test")
    await waitFor(() => {
      expect(screen.getByText("posts/test.mdx")).toBeInTheDocument()
    })
  })

  it("shows date input with frontmatter date value", async () => {
    renderEditor("/editor/posts/test")
    await waitFor(() => {
      expect(screen.getByDisplayValue("2026-05-04")).toBeInTheDocument()
    })
  })

  it("calls updateFile on Ctrl+S", async () => {
    renderEditor("/editor/posts/test")
    await waitFor(() => {
      expect(mockGetFile).toHaveBeenCalled()
    })

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true })
    )

    await waitFor(() => {
      expect(mockUpdateFile).toHaveBeenCalled()
    })
  })
})
