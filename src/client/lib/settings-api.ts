export interface ProviderSettingsView {
  apiKey: string
  model: string
  baseURL: string
  configured: boolean
}

export interface HermesSettingsView {
  gatewayUrl: string
  authToken: string
  model: string
  configured: boolean
}

export interface SettingsView {
  providers: Record<"openai" | "anthropic" | "zhipu" | "gemini", ProviderSettingsView>
  hermes: HermesSettingsView
}

export interface ProviderUpdate {
  apiKey?: string
  model?: string
  baseURL?: string
}

export interface SettingsUpdate {
  providers?: Partial<Record<"openai" | "anthropic" | "zhipu" | "gemini", ProviderUpdate>>
  hermes?: {
    gatewayUrl?: string
    authToken?: string
    model?: string
  }
}

export async function fetchSettings(): Promise<SettingsView> {
  const res = await fetch("/api/settings")
  if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`)
  return res.json()
}

export async function updateSettings(data: SettingsUpdate): Promise<SettingsView> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to update settings: ${error}`)
  }
  return res.json()
}
