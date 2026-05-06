import { Hono } from 'hono'
import { spawn as defaultSpawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import path from 'node:path'

interface BuildStatus {
  status: 'idle' | 'building' | 'success' | 'error'
  lastBuild: string | null
  duration: number | null
  pages: string[]
  errors: string[]
}

const initialStatus: BuildStatus = {
  status: 'idle',
  lastBuild: null,
  duration: null,
  pages: [],
  errors: [],
}

export type SpawnFn = (
  command: string,
  args: readonly string[],
  options: { cwd: string; stdio: 'pipe'; shell: boolean },
) => ChildProcess

export function createBuildRouter(
  astroDir: string = path.resolve(process.cwd(), 'astro'),
  spawn: SpawnFn = defaultSpawn,
) {
  let currentStatus: BuildStatus = { ...initialStatus }

  const app = new Hono()

  app.get('/status', (c) => {
    return c.json(currentStatus)
  })

  app.post('/trigger', async (c) => {
    if (currentStatus.status === 'building') {
      return c.json({ error: 'Build already in progress' }, 409)
    }

    currentStatus = {
      ...currentStatus,
      status: 'building',
      errors: [],
      pages: [],
    }

    const startTime = Date.now()

    buildAsync(astroDir, startTime, spawn)

    return c.json({ message: 'Build started', status: 'building' })
  })

  async function buildAsync(dir: string, startTime: number, spawn: SpawnFn) {
    return new Promise<void>((resolve) => {
      const child = spawn('pnpm', ['astro', 'build'], {
        cwd: dir,
        stdio: 'pipe',
        shell: true,
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        const duration = Date.now() - startTime

        if (code === 0) {
          const pageMatches = stdout.match(/\/[^\s\n]+\.html/g) || []
          currentStatus = {
            status: 'success',
            lastBuild: new Date().toISOString(),
            duration,
            pages: pageMatches,
            errors: [],
          }
        } else {
          currentStatus = {
            ...currentStatus,
            status: 'error',
            duration,
            errors: [stderr || `Build failed with exit code ${code}`],
          }
        }

        resolve()
      })

      child.on('error', (err) => {
        currentStatus = {
          ...currentStatus,
          status: 'error',
          duration: Date.now() - startTime,
          errors: [err.message],
        }
        resolve()
      })
    })
  }

  return app
}
