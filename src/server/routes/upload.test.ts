// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createUploadRouter } from "./upload"
import path from "node:path"
import fs from "node:fs/promises"
import os from "node:os"

let tmpDir: string

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-test-"))
})

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

function makeRequest(url: string, file?: File): Request {
  const form = new FormData()
  if (file) {
    form.append("file", file)
  } else {
    form.append("other", "value")
  }
  return new Request(url, { method: "POST", body: form })
}

describe("POST /image", () => {
  it("returns url for valid PNG file", async () => {
    const app = createUploadRouter(tmpDir)
    const fakePng = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      "test.png",
      { type: "image/png" }
    )
    const res = await app.fetch(makeRequest("http://localhost/image", fakePng))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("url")
    expect(body.url).toMatch(/^\/content\/images\/.+\.png$/)
  })

  it("returns 400 for non-image file", async () => {
    const app = createUploadRouter(tmpDir)
    const textFile = new File(["hello"], "test.txt", { type: "text/plain" })
    const res = await app.fetch(makeRequest("http://localhost/image", textFile))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty("error")
  })

  it("returns 400 when no file provided", async () => {
    const app = createUploadRouter(tmpDir)
    const res = await app.fetch(makeRequest("http://localhost/image"))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty("error")
  })

  it("saves file to disk at the returned url path", async () => {
    const app = createUploadRouter(tmpDir)
    const fakePng = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      "disk-test.png",
      { type: "image/png" }
    )
    const res = await app.fetch(makeRequest("http://localhost/image", fakePng))
    expect(res.status).toBe(200)
    const body = await res.json()

    const filename = body.url.replace("/content/images/", "")
    const filePath = path.join(tmpDir, filename)
    const stat = await fs.stat(filePath)
    expect(stat.size).toBeGreaterThan(0)

    const diskData = await fs.readFile(filePath)
    expect(diskData[0]).toBe(137) // PNG magic byte
  })
})
