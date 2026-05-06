import { Hono } from 'hono'
import type { loadSettings as loadSettingsType, saveSettings as saveSettingsType } from '../lib/settings'
import { maskSettings } from '../lib/settings'
import type { SettingsSchema } from '../lib/settings'

interface ProviderUpdate {
  model?: string
  baseURL?: string
  apiKey?: string
}

interface HermesUpdate {
  gatewayUrl?: string
  model?: string
  authToken?: string
}

interface SettingsUpdate {
  providers?: Record<string, ProviderUpdate>
  hermes?: HermesUpdate
}

export function createSettingsRouter(
  loadSettings: typeof loadSettingsType,
  saveSettings: typeof saveSettingsType,
) {
  const app = new Hono()

  app.get('/', async (c) => {
    const settings = await loadSettings()
    return c.json(maskSettings(settings))
  })

  app.put('/', async (c) => {
    const body = await c.req.json<SettingsUpdate>()
    const current = await loadSettings()

    if (body.providers) {
      for (const [name, update] of Object.entries(body.providers)) {
        const key = name as keyof SettingsSchema['providers']
        if (current.providers[key]) {
          const provider = current.providers[key]
          if (update.model !== undefined) provider.model = update.model
          if (update.baseURL !== undefined) provider.baseURL = update.baseURL
          if (update.apiKey !== undefined && update.apiKey !== '****' && update.apiKey !== '') {
            provider.apiKey = update.apiKey
          }
        }
      }
    }

    if (body.hermes) {
      if (body.hermes.gatewayUrl !== undefined) current.hermes.gatewayUrl = body.hermes.gatewayUrl
      if (body.hermes.model !== undefined) current.hermes.model = body.hermes.model
      if (body.hermes.authToken !== undefined && body.hermes.authToken !== '****' && body.hermes.authToken !== '') {
        current.hermes.authToken = body.hermes.authToken
      }
    }

    await saveSettings(current)
    return c.json(maskSettings(current))
  })

  return app
}
