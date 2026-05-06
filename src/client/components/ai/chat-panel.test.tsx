import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ChatPanel } from "./chat-panel"
import { useAIStream } from "@/lib/hooks/use-ai-stream"
import type { AIProvider } from "@/lib/ai-api"

vi.mock("@/lib/hooks/use-ai-stream", () => ({
  useAIStream: vi.fn(),
}))

vi.mock("@/lib/ai-api", () => ({
  fetchProviders: vi.fn(),
  fetchHermesStatus: vi.fn(),
}))

import { fetchProviders, fetchHermesStatus } from "@/lib/ai-api"
const mockFetchProviders = vi.mocked(fetchProviders)
const mockFetchHermesStatus = vi.mocked(fetchHermesStatus)
const mockUseAIStream = vi.mocked(useAIStream)

const defaultStreamState = {
  content: "",
  loading: false,
  error: null as string | null,
  abort: vi.fn(),
  sendChat: vi.fn(),
  sendComplete: vi.fn(),
  sendHermesChat: vi.fn(),
  setContent: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAIStream.mockReturnValue({ ...defaultStreamState })
  mockFetchProviders.mockResolvedValue([
    { type: "openai", name: "OpenAI", configured: true },
    { type: "anthropic", name: "Anthropic", configured: false },
  ] as AIProvider[])
  mockFetchHermesStatus.mockResolvedValue(false)
})

describe("ChatPanel", () => {
  it("renders header with AI Assistant title", async () => {
    render(<ChatPanel provider="openai" onProviderChange={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText("AI Assistant")).toBeInTheDocument()
    })
  })

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn()
    render(<ChatPanel provider="openai" onProviderChange={vi.fn()} onClose={onClose} />)
    await waitFor(() => {
      expect(screen.getByText("AI Assistant")).toBeInTheDocument()
    })
    const closeButtons = screen.getAllByRole("button")
    const closeButton = closeButtons.find((btn) => btn.querySelector(".lucide-x"))
    expect(closeButton).toBeDefined()
    fireEvent.click(closeButton!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("renders chat input area", async () => {
    render(<ChatPanel provider="openai" onProviderChange={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask AI...")).toBeInTheDocument()
    })
  })

  it("sends a message when Enter is pressed", async () => {
    const sendChat = vi.fn()
    mockUseAIStream.mockReturnValue({ ...defaultStreamState, sendChat })
    render(<ChatPanel provider="openai" onProviderChange={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask AI...")).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText("Ask AI...")
    fireEvent.change(textarea, { target: { value: "Hello AI" } })
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false })

    expect(sendChat).toHaveBeenCalledOnce()
    const callArgs = sendChat.mock.calls[0]
    expect(callArgs[0]).toEqual([{ role: "user", content: "Hello AI" }])
    expect(callArgs[1]).toBe("openai")
  })

  it("shows empty state when no messages", async () => {
    render(<ChatPanel provider="openai" onProviderChange={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Ask anything about your document/)).toBeInTheDocument()
    })
  })

  it("shows error when error state is set", async () => {
    mockUseAIStream.mockReturnValue({ ...defaultStreamState, error: "Something went wrong" })
    render(<ChatPanel provider="openai" onProviderChange={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    })
  })

  it("shows thinking indicator when loading with no content", async () => {
    mockUseAIStream.mockReturnValue({ ...defaultStreamState, loading: true })
    render(<ChatPanel provider="openai" onProviderChange={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText("Thinking...")).toBeInTheDocument()
    })
  })

  it("routes to sendHermesChat when provider is hermes", async () => {
    const sendHermesChat = vi.fn()
    mockUseAIStream.mockReturnValue({ ...defaultStreamState, sendHermesChat })
    mockFetchHermesStatus.mockResolvedValue(true)
    render(<ChatPanel provider="hermes" onProviderChange={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask AI...")).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText("Ask AI...")
    fireEvent.change(textarea, { target: { value: "Hello Hermes" } })
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false })

    expect(sendHermesChat).toHaveBeenCalledOnce()
    expect(sendHermesChat.mock.calls[0][0]).toEqual([{ role: "user", content: "Hello Hermes" }])
  })
})
