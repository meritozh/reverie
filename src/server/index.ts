import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import path from "node:path"
import fs from "node:fs/promises"
import files from "./routes/files"
import upload from "./routes/upload"
import { createAiRouter } from "./routes/ai"
import { createHermesRouter } from "./routes/hermes"
import { createSettingsRouter } from "./routes/settings"
import { createProvider } from "./lib/llm"
import { loadSettings, saveSettings } from "./lib/settings"
import type { ProviderType, LLMProvider } from "./lib/llm"
import type { HermesConfig } from "./lib/hermes"
import { CONTENT_ROOT } from "./lib/content"

const app = new Hono()

app.use("/api/*", cors())

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() })
})

app.get("/content/images/*", async (c) => {
  const imagePath = c.req.path.replace("/content/", "")
  const filePath = path.join(CONTENT_ROOT, imagePath)

  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(CONTENT_ROOT)) {
    return c.text("Forbidden", 403)
  }

  try {
    const data = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    }
    const contentType = contentTypes[ext] || "application/octet-stream"
    return new Response(data, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
    })
  } catch {
    return c.text("Not found", 404)
  }
})

app.route("/api/files", files)
app.route("/api/upload", upload)

const settings = createSettingsRouter(loadSettings, saveSettings)
app.route("/api/settings", settings)

function getProvider(type: ProviderType): LLMProvider | null {
  const configs: Record<string, { type: ProviderType; apiKey: string; model: string; baseURL?: string } | undefined> = {
    openai: process.env.OPENAI_API_KEY ? { type: "openai", apiKey: process.env.OPENAI_API_KEY, model: "gpt-4o" } : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY ? { type: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY, model: "claude-sonnet-4-20250514" } : undefined,
    zhipu: process.env.ZHIPU_API_KEY ? { type: "zhipu", apiKey: process.env.ZHIPU_API_KEY, model: "glm-4-plus" } : undefined,
    gemini: process.env.GEMINI_API_KEY ? { type: "gemini", apiKey: process.env.GEMINI_API_KEY, model: "gemini-2.5-flash" } : undefined,
  }
  const config = configs[type]
  return config ? createProvider(config) : null
}

const ai = createAiRouter(getProvider)
app.route("/api/ai", ai)

function getHermesConfig(): HermesConfig | null {
  const url = process.env.HERMES_GATEWAY_URL
  const token = process.env.HERMES_AUTH_TOKEN
  if (!url || !token) return null
  return { gatewayUrl: url, authToken: token, model: process.env.HERMES_MODEL }
}

const hermes = createHermesRouter(getHermesConfig)
app.route("/api/hermes", hermes)

const port = 3000
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Hono server running on http://localhost:${info.port}`)
})
