import { describe, it, expect, vi } from 'vitest'
import { createBuildRouter } from './build'
import type { SpawnFn } from './build'
import type { ChildProcess } from 'node:child_process'

interface MockChild {
  stdout: { on: (event: string, handler: (...args: unknown[]) => void) => void }
  stderr: { on: (event: string, handler: (...args: unknown[]) => void) => void }
  on: (event: string, handler: (...args: unknown[]) => void) => void
  sendStdout: (data: string) => void
  sendStderr: (data: string) => void
  close: (code: number | null) => void
  error: (err: Error) => void
}

function createMockSpawn(): SpawnFn & { lastChild: MockChild } {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {}

  const child: MockChild = {
    stdout: {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        listeners[`stdout-${event}`] = listeners[`stdout-${event}`] || []
        listeners[`stdout-${event}`].push(handler)
      },
    },
    stderr: {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        listeners[`stderr-${event}`] = listeners[`stderr-${event}`] || []
        listeners[`stderr-${event}`].push(handler)
      },
    },
    on: (event: string, handler: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] || []
      listeners[event].push(handler)
    },
    sendStdout: (data: string) => {
      for (const h of listeners['stdout-data'] ?? []) h(Buffer.from(data))
    },
    sendStderr: (data: string) => {
      for (const h of listeners['stderr-data'] ?? []) h(Buffer.from(data))
    },
    close: (code: number | null) => {
      for (const h of listeners['close'] ?? []) h(code)
    },
    error: (err: Error) => {
      for (const h of listeners['error'] ?? []) h(err)
    },
  }

  const spawnFn = vi.fn(() => child as unknown as ChildProcess) as unknown as SpawnFn & { lastChild: MockChild }
  spawnFn.lastChild = child

  return spawnFn
}

describe('GET /status', () => {
  it('returns initial idle status', async () => {
    const app = createBuildRouter('/fake/astro', createMockSpawn())

    const res = await app.request('/status')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({
      status: 'idle',
      lastBuild: null,
      duration: null,
      pages: [],
      errors: [],
    })
  })
})

describe('POST /trigger', () => {
  it('starts a build and returns 200', async () => {
    const mockSpawn = createMockSpawn()
    const app = createBuildRouter('/fake/astro', mockSpawn)

    const res = await app.request('/trigger', { method: 'POST' })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.message).toBe('Build started')
    expect(body.status).toBe('building')
    expect(mockSpawn).toHaveBeenCalled()
  })

  it('returns 409 if build already in progress', async () => {
    const mockSpawn = createMockSpawn()
    const app = createBuildRouter('/fake/astro', mockSpawn)

    await app.request('/trigger', { method: 'POST' })

    const res = await app.request('/trigger', { method: 'POST' })
    expect(res.status).toBe(409)

    const body = await res.json()
    expect(body.error).toBe('Build already in progress')
  })

  it('updates status to success after successful build', async () => {
    const mockSpawn = createMockSpawn()
    const app = createBuildRouter('/fake/astro', mockSpawn)

    await app.request('/trigger', { method: 'POST' })

    const child = mockSpawn.lastChild
    child.sendStdout('/index.html /posts/hello.html')
    child.close(0)

    const statusRes = await app.request('/status')
    const status = await statusRes.json()
    expect(status.status).toBe('success')
    expect(status.lastBuild).not.toBeNull()
    expect(status.duration).toBeGreaterThanOrEqual(0)
    expect(status.pages).toContain('/index.html')
    expect(status.pages).toContain('/posts/hello.html')
    expect(status.errors).toEqual([])
  })

  it('updates status to error on build failure', async () => {
    const mockSpawn = createMockSpawn()
    const app = createBuildRouter('/fake/astro', mockSpawn)

    await app.request('/trigger', { method: 'POST' })

    const child = mockSpawn.lastChild
    child.sendStderr('Error: something went wrong')
    child.close(1)

    const statusRes = await app.request('/status')
    const status = await statusRes.json()
    expect(status.status).toBe('error')
    expect(status.errors).toContain('Error: something went wrong')
  })

  it('handles spawn error', async () => {
    const mockSpawn = createMockSpawn()
    const app = createBuildRouter('/fake/astro', mockSpawn)

    await app.request('/trigger', { method: 'POST' })

    const child = mockSpawn.lastChild
    child.error(new Error('pnpm not found'))

    const statusRes = await app.request('/status')
    const status = await statusRes.json()
    expect(status.status).toBe('error')
    expect(status.errors).toContain('pnpm not found')
  })
})
