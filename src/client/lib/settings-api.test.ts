import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchSettings, updateSettings } from "./settings-api"

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe("settings-api", () => {
  describe("fetchSettings", () => {
    it("returns settings on success", async () => {
      const mockSettings = {
        providers: {
          openai: { apiKey: "sk-***", model: "gpt-4", baseURL: "https://api.openai.com/v1", configured: true },
          anthropic: { apiKey: "", model: "", baseURL: "", configured: false },
          zhipu: { apiKey: "", model: "", baseURL: "", configured: false },
          gemini: { apiKey: "", model: "", baseURL: "", configured: false },
        },
        hermes: { gatewayUrl: "", authToken: "", model: "", configured: false },
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSettings) })

      const result = await fetchSettings()
      expect(mockFetch).toHaveBeenCalledWith("/api/settings")
      expect(result).toEqual(mockSettings)
    })

    it("throws on server error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
      await expect(fetchSettings()).rejects.toThrow("Failed to fetch settings: 500")
    })
  })

  describe("updateSettings", () => {
    it("sends PUT with correct body", async () => {
      const mockSettings = {
        providers: {
          openai: { apiKey: "sk-***", model: "gpt-4", baseURL: "https://api.openai.com/v1", configured: true },
          anthropic: { apiKey: "", model: "", baseURL: "", configured: false },
          zhipu: { apiKey: "", model: "", baseURL: "", configured: false },
          gemini: { apiKey: "", model: "", baseURL: "", configured: false },
        },
        hermes: { gatewayUrl: "", authToken: "", model: "", configured: false },
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSettings) })

      const update = {
        providers: {
          openai: { apiKey: "sk-new-key", model: "gpt-4-turbo" },
        },
      }
      const result = await updateSettings(update)

      expect(mockFetch).toHaveBeenCalledWith("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
      expect(result).toEqual(mockSettings)
    })

    it("returns updated settings", async () => {
      const mockSettings = {
        providers: {
          openai: { apiKey: "sk-***", model: "gpt-4-turbo", baseURL: "https://api.openai.com/v1", configured: true },
          anthropic: { apiKey: "", model: "", baseURL: "", configured: false },
          zhipu: { apiKey: "", model: "", baseURL: "", configured: false },
          gemini: { apiKey: "", model: "", baseURL: "", configured: false },
        },
        hermes: { gatewayUrl: "http://localhost:8000", authToken: "test-token", model: "gpt-4", configured: true },
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSettings) })

      const update = {
        providers: {
          openai: { model: "gpt-4-turbo" },
        },
        hermes: {
          gatewayUrl: "http://localhost:8000",
          authToken: "test-token",
        },
      }
      const result = await updateSettings(update)

      expect(result).toEqual(mockSettings)
    })

    it("throws on server error with error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Invalid API key format"),
      })

      const update = {
        providers: {
          openai: { apiKey: "invalid" },
        },
      }
      await expect(updateSettings(update)).rejects.toThrow("Failed to update settings: Invalid API key format")
    })
  })
})
