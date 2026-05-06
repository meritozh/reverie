import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBuildStatus, triggerBuild } from './build-api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('build-api', () => {
  describe('fetchBuildStatus', () => {
    it('returns build status on success', async () => {
      const mockStatus = {
        status: 'idle',
        lastBuild: null,
        duration: null,
        pages: [],
        errors: [],
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) })

      const result = await fetchBuildStatus()
      expect(mockFetch).toHaveBeenCalledWith('/api/build/status')
      expect(result).toEqual(mockStatus)
    })

    it('throws on server error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
      await expect(fetchBuildStatus()).rejects.toThrow('Failed to fetch build status: 500')
    })
  })

  describe('triggerBuild', () => {
    it('sends POST and returns message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Build started', status: 'building' }),
      })

      const result = await triggerBuild()
      expect(mockFetch).toHaveBeenCalledWith('/api/build/trigger', { method: 'POST' })
      expect(result.message).toBe('Build started')
    })

    it('throws on 409 build already in progress', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Build already in progress' }),
      })

      await expect(triggerBuild()).rejects.toThrow('Build already in progress')
    })

    it('throws with status code when no error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await expect(triggerBuild()).rejects.toThrow('Build trigger failed: 500')
    })
  })
})
