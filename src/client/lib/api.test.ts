import { describe, it, expect, vi, beforeEach } from "vitest"
import { listFiles, getFile, createFile, updateFile, deleteFile, uploadImage, renderPreview } from "./api"

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe("api client", () => {
  describe("listFiles", () => {
    it("calls GET /api/files and returns file array", async () => {
      const files = [{ name: "hello.mdx", path: "posts/hello.mdx", type: "mdx", size: 100, modified: "2026-01-01" }]
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ files }) })

      const result = await listFiles()
      expect(mockFetch).toHaveBeenCalledWith("/api/files")
      expect(result).toEqual(files)
    })

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
      await expect(listFiles()).rejects.toThrow("Failed to list files")
    })
  })

  describe("getFile", () => {
    it("calls GET /api/files/:path", async () => {
      const data = { content: "# Hello", frontmatter: { title: "Hello" } }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) })

      const result = await getFile("posts/hello.mdx")
      expect(mockFetch).toHaveBeenCalledWith("/api/files/posts/hello.mdx")
      expect(result).toEqual(data)
    })

    it("throws on 404", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
      await expect(getFile("posts/missing.mdx")).rejects.toThrow()
    })
  })

  describe("createFile", () => {
    it("calls POST /api/files with path and content", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })

      await createFile("posts/new.mdx", "---\ntitle: New\n---\nHello")
      expect(mockFetch).toHaveBeenCalledWith("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "posts/new.mdx", content: "---\ntitle: New\n---\nHello" }),
      })
    })
  })

  describe("updateFile", () => {
    it("calls PUT /api/files/:path with content", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })

      await updateFile("posts/hello.mdx", "updated content")
      expect(mockFetch).toHaveBeenCalledWith("/api/files/posts/hello.mdx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated content" }),
      })
    })
  })

  describe("deleteFile", () => {
    it("calls DELETE /api/files/:path", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })

      await deleteFile("posts/hello.mdx")
      expect(mockFetch).toHaveBeenCalledWith("/api/files/posts/hello.mdx", {
        method: "DELETE",
      })
    })
  })

  describe("uploadImage", () => {
    it("calls POST /api/upload/image with FormData", async () => {
      const mockResult = { url: "/content/images/test.png" }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResult) })

      const file = new File(["data"], "test.png", { type: "image/png" })
      const result = await uploadImage(file)

      expect(mockFetch).toHaveBeenCalledWith("/api/upload/image", expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }))
      expect(result).toEqual(mockResult)
    })

    it("throws on non-image file rejection", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 })
      const file = new File(["data"], "test.txt", { type: "text/plain" })
      await expect(uploadImage(file)).rejects.toThrow()
    })
  })

  describe("renderPreview", () => {
    it("renders TSX component", async () => {
      const mockResult = { html: "<div>Hello</div>" }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
        text: () => Promise.resolve("error text"),
      })

      const request = { code: "export default function Hello() { return <div>Hello</div> }", type: "tsx" as const }
      const result = await renderPreview(request)

      expect(mockFetch).toHaveBeenCalledWith("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      expect(result).toEqual(mockResult)
    })

    it("renders MDX content", async () => {
      const mockResult = { html: "<h1>Hello World</h1>" }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
        text: () => Promise.resolve("error text"),
      })

      const request = { code: "# Hello World", type: "mdx" as const }
      const result = await renderPreview(request)

      expect(mockFetch).toHaveBeenCalledWith("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      expect(result).toEqual(mockResult)
    })

    it("passes props to preview", async () => {
      const mockResult = { html: "<div>Test Component</div>" }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
        text: () => Promise.resolve("error text"),
      })

      const request = {
        code: "export default function Component({ title }: { title: string }) { return <div>{title}</div> }",
        type: "tsx" as const,
        props: { title: "Test Component" },
      }
      const result = await renderPreview(request)

      expect(mockFetch).toHaveBeenCalledWith("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      expect(result).toEqual(mockResult)
    })

    it("throws on server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      })

      const request = { code: "invalid code", type: "tsx" as const }
      await expect(renderPreview(request)).rejects.toThrow("Preview failed: Internal Server Error")
    })
  })
})
