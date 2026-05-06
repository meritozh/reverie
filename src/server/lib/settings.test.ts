// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'
import {
  loadSettings,
  saveSettings,
  maskKey,
  maskSettings,
} from './settings'
import type { SettingsSchema } from './settings'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reverie-settings-test-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const settingsPath = () => path.join(tmpDir, 'settings.json')

describe('maskKey', () => {
  it('masks long key with first4****last4', () => {
    expect(maskKey('sk-1234567890abcdef')).toBe('sk-1****cdef')
  })

  it('masks short key as ****', () => {
    expect(maskKey('short')).toBe('****')
  })

  it('returns empty string for empty key', () => {
    expect(maskKey('')).toBe('')
  })

  it('masks exactly 8-char key as ****', () => {
    expect(maskKey('12345678')).toBe('****')
  })

  it('masks 9-char key with first4****last4', () => {
    expect(maskKey('123456789')).toBe('1234****6789')
  })
})

describe('loadSettings', () => {
  it('returns defaults when file does not exist', async () => {
    const settings = await loadSettings(path.join(tmpDir, 'nonexistent.json'))
    expect(settings.providers.openai.model).toBe('gpt-4o')
    expect(settings.providers.anthropic.model).toBe('claude-sonnet-4-20250514')
    expect(settings.providers.zhipu.model).toBe('glm-4-plus')
    expect(settings.providers.gemini.model).toBe('gemini-2.5-flash')
    expect(settings.providers.zhipu.baseURL).toBe('https://open.bigmodel.cn/api/paas/v4')
    expect(settings.hermes.gatewayUrl).toBe('')
  })

  it('merges partial file with defaults', async () => {
    const partial = {
      providers: {
        openai: { apiKey: 'sk-test-key', model: 'gpt-4o-mini', baseURL: '' },
      },
    }
    await fs.writeFile(settingsPath(), JSON.stringify(partial), 'utf-8')

    const settings = await loadSettings(settingsPath())

    expect(settings.providers.openai.apiKey).toBe('sk-test-key')
    expect(settings.providers.openai.model).toBe('gpt-4o-mini')
    expect(settings.providers.anthropic.model).toBe('claude-sonnet-4-20250514')
    expect(settings.providers.anthropic.apiKey).toBe('')
    expect(settings.providers.zhipu.model).toBe('glm-4-plus')
    expect(settings.providers.zhipu.baseURL).toBe('https://open.bigmodel.cn/api/paas/v4')
    expect(settings.hermes.gatewayUrl).toBe('')
  })
})

describe('saveSettings + loadSettings roundtrip', () => {
  it('saves and loads settings correctly', async () => {
    const settings: SettingsSchema = {
      providers: {
        openai: { apiKey: 'sk-abc123', model: 'gpt-4o', baseURL: '' },
        anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseURL: '' },
        zhipu: { apiKey: 'zhipu-key', model: 'glm-4-plus', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
        gemini: { apiKey: '', model: 'gemini-2.5-flash', baseURL: '' },
      },
      hermes: { gatewayUrl: 'https://hermes.test', authToken: 'tok-123', model: 'v2' },
    }

    await saveSettings(settings, settingsPath())
    const loaded = await loadSettings(settingsPath())

    expect(loaded).toEqual(settings)
  })
})

describe('maskSettings', () => {
  it('masks all API keys and adds configured booleans', () => {
    const settings: SettingsSchema = {
      providers: {
        openai: { apiKey: 'sk-long-api-key-here', model: 'gpt-4o', baseURL: '' },
        anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseURL: '' },
        zhipu: { apiKey: 'short', model: 'glm-4-plus', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
        gemini: { apiKey: '', model: 'gemini-2.5-flash', baseURL: '' },
      },
      hermes: { gatewayUrl: 'https://hermes.test', authToken: 'auth-token-123', model: 'v2' },
    }

    const masked = maskSettings(settings) as Record<string, any>

    expect(masked.providers.openai.apiKey).toBe('sk-l****here')
    expect(masked.providers.anthropic.apiKey).toBe('')
    expect(masked.providers.zhipu.apiKey).toBe('****')
    expect(masked.providers.gemini.apiKey).toBe('')

    expect(masked.providers.openai.configured).toBe(true)
    expect(masked.providers.anthropic.configured).toBe(false)
    expect(masked.providers.zhipu.configured).toBe(true)
    expect(masked.providers.gemini.configured).toBe(false)

    expect(masked.hermes.authToken).toBe('auth****-123')
    expect(masked.hermes.configured).toBe(true)

    expect(masked.providers.openai.model).toBe('gpt-4o')
    expect(masked.hermes.gatewayUrl).toBe('https://hermes.test')
  })

  it('marks hermes as unconfigured when gatewayUrl is empty', () => {
    const settings: SettingsSchema = {
      providers: {
        openai: { apiKey: '', model: 'gpt-4o', baseURL: '' },
        anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseURL: '' },
        zhipu: { apiKey: '', model: 'glm-4-plus', baseURL: '' },
        gemini: { apiKey: '', model: 'gemini-2.5-flash', baseURL: '' },
      },
      hermes: { gatewayUrl: '', authToken: 'some-token', model: '' },
    }

    const masked = maskSettings(settings) as Record<string, any>
    expect(masked.hermes.configured).toBe(false)
  })
})
