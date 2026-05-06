export interface BuildStatus {
  status: 'idle' | 'building' | 'success' | 'error'
  lastBuild: string | null
  duration: number | null
  pages: string[]
  errors: string[]
}

export async function fetchBuildStatus(): Promise<BuildStatus> {
  const res = await fetch('/api/build/status')
  if (!res.ok) throw new Error(`Failed to fetch build status: ${res.status}`)
  return res.json()
}

export async function triggerBuild(): Promise<{ message: string }> {
  const res = await fetch('/api/build/trigger', { method: 'POST' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || `Build trigger failed: ${res.status}`)
  }
  return res.json()
}
