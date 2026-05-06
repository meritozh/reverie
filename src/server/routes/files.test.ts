import { describe, it, expect, beforeAll, afterAll } from "vitest"
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { createFilesRouter } from "./files"

let tmpDir: string
let app: ReturnType<typeof createFilesRouter>

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reverie-test-"))

  // Create test file structure
  await fs.mkdir(path.join(tmpDir, "posts"), { recursive: true })
  await fs.mkdir(path.join(tmpDir, "components"), { recursive: true })

  await fs.writeFile(
    path.join(tmpDir, "posts", "hello.mdx"),
    `---\ntitle: Hello World\ndate: 2024-01-01\n---\n# Hello\nThis is content.`,
    "utf-8"
  )
  await fs.writeFile(
    path.join(tmpDir, "posts", "second.mdx"),
    `---\ntitle: Second Post\n---\nSecond post body.`,
    "utf-8"
  )
  await fs.writeFile(
    path.join(tmpDir, "components", "hero.tsx"),
    `export default function Hero() { return <div>Hero</div> }`,
    "utf-8"
  )
  // A non-matching file that should be excluded from listing
  await fs.writeFile(
    path.join(tmpDir, "posts", "notes.txt"),
    "plain text file",
    "utf-8"
  )

  app = createFilesRouter(tmpDir)
})

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe("GET /", () => {
  it("returns array of files from content directory", async () => {
    const res = await app.request("/")
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.files)).toBe(true)

    // Should include .mdx and .tsx files but NOT .txt
    const filePaths = body.files.map((f: { path: string }) => f.path)
    expect(filePaths).toContain("posts/hello.mdx")
    expect(filePaths).toContain("posts/second.mdx")
    expect(filePaths).toContain("components/hero.tsx")
    expect(filePaths).not.toContain("posts/notes.txt")

    // Each file entry should have required fields
    const hello = body.files.find(
      (f: { path: string }) => f.path === "posts/hello.mdx"
    )
    expect(hello).toBeDefined()
    expect(hello.type).toBe("mdx")
    expect(hello.name).toBe("hello.mdx")
    expect(typeof hello.size).toBe("number")
    expect(typeof hello.modified).toBe("string")
  })
})

describe("GET /:path", () => {
  it("reads a specific .mdx file, returns content + parsed frontmatter", async () => {
    const res = await app.request("/posts/hello.mdx")
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.content).toContain("# Hello")
    expect(body.content).toContain("This is content.")
    expect(body.frontmatter.title).toBe("Hello World")
    expect(new Date(body.frontmatter.date).toISOString()).toContain("2024-01-01")
  })

  it("returns 404 for nonexistent file", async () => {
    const res = await app.request("/posts/nonexistent.mdx")
    expect(res.status).toBe(404)
  })

  it("returns 400 for path traversal attempt", async () => {
    const res = await app.request("/..%2fetc/passwd")
    expect(res.status).toBe(400)
  })
})

describe("POST /", () => {
  it("creates a new file", async () => {
    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "posts/new-post.mdx",
        content: "---\ntitle: New Post\n---\nNew content here.",
      }),
    })
    expect(res.status).toBe(201)

    // Verify file was actually created
    const written = await fs.readFile(
      path.join(tmpDir, "posts", "new-post.mdx"),
      "utf-8"
    )
    expect(written).toContain("New content here.")
  })

  it("returns 400 when path is missing", async () => {
    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "some content" }),
    })
    expect(res.status).toBe(400)
  })
})

describe("PUT /:path", () => {
  it("updates file content", async () => {
    const res = await app.request("/posts/hello.mdx", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "---\ntitle: Updated\n---\nUpdated body." }),
    })
    expect(res.status).toBe(200)

    // Verify file was updated
    const updated = await fs.readFile(
      path.join(tmpDir, "posts", "hello.mdx"),
      "utf-8"
    )
    expect(updated).toBe("---\ntitle: Updated\n---\nUpdated body.")
  })
})

describe("DELETE /:path", () => {
  it("deletes a file", async () => {
    const res = await app.request("/posts/second.mdx", {
      method: "DELETE",
    })
    expect(res.status).toBe(200)

    // Verify file was actually deleted
    await expect(
      fs.access(path.join(tmpDir, "posts", "second.mdx"))
    ).rejects.toThrow()
  })
})
