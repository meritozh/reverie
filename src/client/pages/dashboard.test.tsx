import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import DashboardPage from "./dashboard"
import * as api from "@/lib/api"

vi.spyOn(api, "listFiles")
vi.spyOn(api, "createFile")
vi.spyOn(api, "deleteFile")

const mockFiles: api.ContentFile[] = [
  { name: "getting-started.mdx", path: "posts/getting-started.mdx", type: "mdx", size: 256, modified: "2026-05-04T00:00:00.000Z" },
  { name: "markdown-guide.mdx", path: "posts/markdown-guide.mdx", type: "mdx", size: 512, modified: "2026-05-04T00:00:00.000Z" },
  { name: "callout.tsx", path: "components/callout.tsx", type: "tsx", size: 128, modified: "2026-05-04T00:00:00.000Z" },
]

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(api.listFiles).mockResolvedValue(mockFiles)
    vi.mocked(api.createFile).mockResolvedValue(undefined)
    vi.mocked(api.deleteFile).mockResolvedValue(undefined)
  })

  it("renders file list from API", async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("getting-started.mdx")).toBeInTheDocument()
    })
    expect(screen.getByText("markdown-guide.mdx")).toBeInTheDocument()
    expect(screen.getByText("callout.tsx")).toBeInTheDocument()
  })

  it("shows MDX type badges", async () => {
    renderDashboard()
    await waitFor(() => {
      const badges = screen.getAllByText("mdx")
      expect(badges.length).toBe(2)
    })
  })

  it("shows TSX type badge", async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("tsx")).toBeInTheDocument()
    })
  })

  it("shows empty state when no files", async () => {
    vi.mocked(api.listFiles).mockResolvedValue([])
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/no files/i)).toBeInTheDocument()
    })
  })

  it("filters out directory entries", async () => {
    const withDirs = [...mockFiles, { name: "posts", path: "posts", type: "directory" as const, size: 0, modified: "" }]
    vi.mocked(api.listFiles).mockResolvedValue(withDirs)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("getting-started.mdx")).toBeInTheDocument()
    })
    expect(screen.queryByText("posts")).not.toBeInTheDocument()
  })

  it("shows New Post button", async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/new post/i)).toBeInTheDocument()
    })
  })

  it("opens create dialog on New Post click", async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("getting-started.mdx")).toBeInTheDocument()
    })
    await user.click(screen.getByText(/new post/i))
    await waitFor(() => {
      expect(screen.getByText(/create new post/i)).toBeInTheDocument()
    })
  })

  it("creates file and navigates on form submit", async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("getting-started.mdx")).toBeInTheDocument()
    })

    await user.click(screen.getByText(/new post/i))
    await waitFor(() => {
      expect(screen.getByText(/create new post/i)).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText(/title/i)
    await user.type(titleInput, "My New Post")

    await user.click(screen.getByRole("button", { name: /create$/i }))
    expect(api.createFile).toHaveBeenCalledWith(
      "posts/my-new-post.mdx",
      expect.stringContaining("My New Post")
    )
  })

  it("shows delete option in context menu on right-click", async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("getting-started.mdx")).toBeInTheDocument()
    })

    const row = screen.getByText("getting-started.mdx").closest("tr")!
    await user.pointer({ keys: "[MouseRight]", target: row })

    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument()
    })
  })

  it("deletes file and refreshes list", async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("getting-started.mdx")).toBeInTheDocument()
    })

    const row = screen.getByText("getting-started.mdx").closest("tr")!
    await user.pointer({ keys: "[MouseRight]", target: row })

    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument()
    })

    await user.click(screen.getByText(/delete/i))

    await waitFor(() => {
      expect(screen.getByText(/confirm delete/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /^delete$/i }))

    expect(api.deleteFile).toHaveBeenCalledWith("posts/getting-started.mdx")
  })
})
