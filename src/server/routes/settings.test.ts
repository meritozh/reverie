// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createSettingsRouter } from './settings'
import { loadSettings, saveSettings } from '../lib/settings'

let tmpDir: string
let settingsPath: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reverie-settings-test-'))
  settingsPath = path.join(tmpDir, 'settings.json')
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

function createApp(filePath: string = settingsPath) {
  const _loadSettings = () => loadSettings(filePath)
  const _saveSettings = (settings: Parameters<typeof saveSettings>[0]) => saveSettings(settings, filePath)
  return createSettingsRouter(_loadSettings, _saveSettings)
}

describe('GET /', () => {
  it('returns settings with masked API keys', async () => {
    await saveSettings({
      providers: {
        openai: { apiKey: 'sk-1234567890abcdef', model: 'gpt-4o', baseURL: '' },
        anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseURL: '' },
        zhipu: { apiKey: '', model: 'glm-4-plus', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
        gemini: { apiKey: '', model: 'gemini-2.5-flash', baseURL: '' },
      },
      hermes: { gatewayUrl: '', authToken: '', model: '' },
    }, settingsPath)

    const app = createApp()
    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.providers.openai.apiKey).toBe('sk-1****cdef')
    expect(body.providers.openai.configured).toBe(true)
    expect(body.providers.anthropic.apiKey).toBe('')
    expect(body.providers.anthropic.configured).toBe(false)
  })

  it('returns configured=false for providers without API keys', async () => {
    const app = createApp()
    const res = await app.request('/')
    const body = await res.json()

    expect(body.providers.openai.configured).toBe(false)
    expect(body.providers.anthropic.configured).toBe(false)
    expect(body.providers.zhipu.configured).toBe(false)
    expect(body.providers.gemini.configured).toBe(false)
    expect(body.hermes.configured).toBe(false)
  })
})

describe('PUT /', () => {
  it('updates model and baseURL', async () => {
    const app = createApp()
    await app.request('/')

    const res = await app.request('/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providers: {
          openai: { model: 'gpt-4o-mini', baseURL: 'https://custom.api.com' },
        },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.providers.openai.model).toBe('gpt-4o-mini')
    expect(body.providers.openai.baseURL).toBe('https://custom.api.com')
  })

  it('updates API key when new value provided', async () => {
    const app = createApp()
    await app.request('/')

    const res = await app.request('/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providers: {
          openai: { apiKey: 'sk-newkey1234567890' },
        },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.providers.openai.apiKey).toBe('sk-n****7890')
    expect(body.providers.openai.configured).toBe(true)

    const saved = await loadSettings(settingsPath)
    expect(saved.providers.openai.apiKey).toBe('sk-newkey1234567890')
  })

  it('preserves API key when value is "****"', async () => {
    await saveSettings({
      providers: {
        openai: { apiKey: 'sk-originalsecret', model: 'gpt-4o', baseURL: '' },
        anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseURL: '' },
        zhipu: { apiKey: '', model: 'glm-4-plus', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
        gemini: { apiKey: '', model: 'gemini-2.5-flash', baseURL: '' },
      },
      hermes: { gatewayUrl: '', authToken: '', model: '' },
    }, settingsPath)

    const app = createApp()

    const res = await app.request('/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providers: {
          openai: { apiKey: '****', model: 'gpt-4o-mini' },
        },
      }),
    })

    expect(res.status).toBe(200)

    const saved = await loadSettings(settingsPath)
    expect(saved.providers.openai.apiKey).toBe('sk-originalsecret')
    expect(saved.providers.openai.model).toBe('gpt-4o-mini')
  })

  it('preserves API key when value is empty string', async () => {
    await saveSettings({
      providers: {
        openai: { apiKey: 'sk-keepme12345678', model: 'gpt-4o', baseURL: '' },
        anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseURL: '' },
        zhipu: { apiKey: '', model: 'glm-4-plus', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
        gemini: { apiKey: '', model: 'gemini-2.5-flash', baseURL: '' },
      },
      hermes: { gatewayUrl: '', authToken: '', model: '' },
    }, settingsPath)

    const app = createApp()

    const res = await app.request('/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providers: {
          openai: { apiKey: '', model: 'gpt-4o-mini' },
        },
      }),
    })

    expect(res.status).toBe(200)

    const saved = await loadSettings(settingsPath)
    expect(saved.providers.openai.apiKey).toBe('sk-keepme12345678')
    expect(saved.providers.openai.model).toBe('gpt-4o-mini')
  })

  it('updates Hermes settings', async () => {
    const app = createApp()
    await app.request('/')

    const res = await app.request('/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hermes: { gatewayUrl: 'https://hermes.test.com', model: 'hermes-v3' },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hermes.gatewayUrl).toBe('https://hermes.test.com')
    expect(body.hermes.model).toBe('hermes-v3')
  })

  it('updates Hermes authToken with new value', async () => {
    const app = createApp()
    await app.request('/')

    const res = await app.request('/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hermes: { authToken: 'new-auth-token-value', gatewayUrl: 'https://gw.example.com' },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hermes.configured).toBe(true)

    const saved = await loadSettings(settingsPath)
    expect(saved.hermes.authToken).toBe('new-auth-token-value')
  })

  it('preserves Hermes authToken when value is "****"', async () => {
    await saveSettings({
      providers: {
        openai: { apiKey: '', model: 'gpt-4o', baseURL: '' },
        anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseURL: '' },
        zhipu: { apiKey: '', model: 'glm-4-plus', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
        gemini: { apiKey: '', model: 'gemini-2.5-flash', baseURL: '' },
      },
      hermes: { gatewayUrl: 'https://gw.example.com', authToken: 'original-token', model: '' },
    }, settingsPath)

    const app = createApp()

    const res = await app.request('/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hermes: { authToken: '****', model: 'updated-model' },
      }),
    })

    expect(res.status).toBe(200)

    const saved = await loadSettings(settingsPath)
    expect(saved.hermes.authToken).toBe('original-token')
    expect(saved.hermes.model).toBe('updated-model')
  })
})
