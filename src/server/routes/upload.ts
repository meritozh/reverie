import { Hono } from "hono"
import path from "node:path"
import fs from "node:fs/promises"
import { CONTENT_ROOT } from "../lib/content"

export function createUploadRouter(imagesDir: string) {
  const app = new Hono()

  app.post("/image", async (c) => {
    const body = await c.req.parseBody()
    const file = body["file"]

    if (!(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400)
    }

    if (!file.type.startsWith("image/")) {
      return c.json({ error: "File must be an image" }, 400)
    }

    const ext = file.type.split("/")[1] || "png"
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    await fs.mkdir(imagesDir, { recursive: true })

    const filePath = path.join(imagesDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)

    return c.json({ url: `/content/images/${filename}` })
  })

  return app
}

export default createUploadRouter(path.join(CONTENT_ROOT, "images"))
