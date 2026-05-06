import path from 'node:path'
import fs from 'node:fs/promises'

export interface ProviderSettings {
  apiKey: string
  model: string
  baseURL: string
}

export interface HermesSettings {
  gatewayUrl: string
  authToken: string
  model: string
}

export interface SettingsSchema {
  providers: {
    openai: ProviderSettings
    anthropic: ProviderSettings
    zhipu: ProviderSettings
    gemini: ProviderSettings
  }
  hermes: HermesSettings
}

const DEFAULT_SETTINGS: SettingsSchema = {
  providers: {
    openai: { apiKey: '', model: 'gpt-4o', baseURL: '' },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseURL: '' },
    zhipu: { apiKey: '', model: 'glm-4-plus', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
    gemini: { apiKey: '', model: 'gemini-2.5-flash', baseURL: '' },
  },
  hermes: { gatewayUrl: '', authToken: '', model: '' },
}

export const SETTINGS_PATH = path.resolve(process.cwd(), 'settings.json')

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function deepMerge(defaults: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result = { ...defaults }
  for (const key of Object.keys(overrides)) {
    const overrideVal = overrides[key]
    const defaultVal = result[key]
    if (isRecord(overrideVal) && isRecord(defaultVal)) {
      result[key] = deepMerge(defaultVal, overrideVal)
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal
    }
  }
  return result
}

const DEFAULTS_RECORD = DEFAULT_SETTINGS as unknown as Record<string, unknown>

export async function loadSettings(filePath: string = SETTINGS_PATH): Promise<SettingsSchema> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return deepMerge(DEFAULTS_RECORD, parsed) as unknown as SettingsSchema
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings: SettingsSchema, filePath: string = SETTINGS_PATH): Promise<void> {
  const tmpPath = filePath + '.tmp'
  await fs.writeFile(tmpPath, JSON.stringify(settings, null, 2), 'utf-8')
  await fs.rename(tmpPath, filePath)
}

export function maskKey(key: string): string {
  if (key.length === 0) return ''
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}

export function maskSettings(settings: SettingsSchema): Record<string, unknown> {
  const providers: Record<string, unknown> = {}
  for (const [name, provider] of Object.entries(settings.providers)) {
    providers[name] = {
      ...provider,
      apiKey: maskKey(provider.apiKey),
      configured: provider.apiKey.length > 0,
    }
  }

  return {
    providers,
    hermes: {
      ...settings.hermes,
      authToken: maskKey(settings.hermes.authToken),
      configured: settings.hermes.gatewayUrl.length > 0 && settings.hermes.authToken.length > 0,
    },
  }
}
