import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import App from "./App"
import * as api from "@/lib/api"
import * as settingsApi from "@/lib/settings-api"

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  )
}

describe("App", () => {
  beforeEach(() => {
    vi.spyOn(api, "getFile").mockResolvedValue({
      content: "test",
      frontmatter: { title: "Test" },
    })
    vi.spyOn(api, "listFiles").mockResolvedValue([])
    vi.spyOn(settingsApi, "fetchSettings").mockResolvedValue({
      providers: {
        openai: { apiKey: "****", model: "gpt-4o", baseURL: "", configured: false },
        anthropic: { apiKey: "****", model: "claude-sonnet-4-20250514", baseURL: "", configured: false },
        zhipu: { apiKey: "****", model: "glm-4-plus", baseURL: "", configured: false },
        gemini: { apiKey: "****", model: "gemini-2.5-flash", baseURL: "", configured: false },
      },
      hermes: { gatewayUrl: "", authToken: "****", model: "", configured: false },
    })
  })

  it("renders dashboard page at /", async () => {
    renderApp("/")
    await waitFor(() => {
      expect(screen.getByText(/no files/i)).toBeInTheDocument()
    })
  })

  it("renders editor page at /editor/posts/test", async () => {
    renderApp("/editor/posts/test")
    await waitFor(() => {
      expect(screen.getByText("posts/test.mdx")).toBeInTheDocument()
    })
  })

  it("renders component editor page at /component-editor/components/test", async () => {
    renderApp("/component-editor/components/test")
    await waitFor(() => {
      expect(screen.getByText("components/test.tsx")).toBeInTheDocument()
    })
  })

  it("renders theme toggle button", () => {
    renderApp("/")
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument()
  })

  it("renders settings gear button in header", () => {
    renderApp("/")
    expect(screen.getByTitle("Settings")).toBeInTheDocument()
  })

  it("renders settings page at /settings", async () => {
    renderApp("/settings")
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument()
      expect(screen.getByText("AI Providers")).toBeInTheDocument()
    })
  })
})
