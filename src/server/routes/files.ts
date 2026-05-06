import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import {
  CONTENT_ROOT,
  listContentFiles,
  readContentFile,
  writeContentFile,
  deleteContentFile,
} from "../lib/content"

export function createFilesRouter(contentRoot: string) {
  const app = new Hono()

  app.get("/", async (c) => {
    const files = await listContentFiles(contentRoot)
    return c.json({ files })
  })

  app.get("/:path{.+}", async (c) => {
    const relativePath = c.req.param("path")
    try {
      const result = await readContentFile(contentRoot, relativePath)
      if (!result) {
        throw new HTTPException(404, { message: "File not found" })
      }
      return c.json(result)
    } catch (err) {
      if (err instanceof HTTPException) throw err
      if (err instanceof Error && err.message.includes("directory traversal")) {
        throw new HTTPException(400, { message: err.message })
      }
      throw new HTTPException(500, { message: "Failed to read file" })
    }
  })

  app.post("/", async (c) => {
    const body = await c.req.json<{ path?: string; content?: string }>()
    if (!body.path) {
      throw new HTTPException(400, { message: "path is required" })
    }
    try {
      await writeContentFile(contentRoot, body.path, body.content ?? "")
      return c.json({ ok: true }, 201)
    } catch (err) {
      if (err instanceof Error && err.message.includes("directory traversal")) {
        throw new HTTPException(400, { message: err.message })
      }
      throw new HTTPException(500, { message: "Failed to write file" })
    }
  })

  app.put("/:path{.+}", async (c) => {
    const relativePath = c.req.param("path")
    const body = await c.req.json<{ content?: string }>()
    try {
      await writeContentFile(contentRoot, relativePath, body.content ?? "")
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof Error && err.message.includes("directory traversal")) {
        throw new HTTPException(400, { message: err.message })
      }
      throw new HTTPException(500, { message: "Failed to update file" })
    }
  })

  app.delete("/:path{.+}", async (c) => {
    const relativePath = c.req.param("path")
    try {
      await deleteContentFile(contentRoot, relativePath)
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof Error && err.message.includes("directory traversal")) {
        throw new HTTPException(400, { message: err.message })
      }
      throw new HTTPException(500, { message: "Failed to delete file" })
    }
  })

  return app
}

export default createFilesRouter(CONTENT_ROOT)
