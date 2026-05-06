import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { fetchSettings, updateSettings } from '@/lib/settings-api'
import type { SettingsView, ProviderUpdate } from '@/lib/settings-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { ArrowLeft, Save } from 'lucide-react'

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  zhipu: 'Zhipu / GLM',
  gemini: 'Google Gemini',
}

const PROVIDER_KEYS = ['openai', 'anthropic', 'zhipu', 'gemini'] as const

interface ProviderFormState {
  apiKey: string
  model: string
  baseURL: string
  keyEdited: boolean
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [providerForms, setProviderForms] = useState<Record<string, ProviderFormState>>({})
  const [hermesForm, setHermesForm] = useState({ gatewayUrl: '', authToken: '', model: '', tokenEdited: false })

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        setSettings(data)
        const forms: Record<string, ProviderFormState> = {}
        for (const key of PROVIDER_KEYS) {
          const p = data.providers[key]
          forms[key] = {
            apiKey: p.apiKey,
            model: p.model,
            baseURL: p.baseURL,
            keyEdited: false,
          }
        }
        setProviderForms(forms)
        setHermesForm({
          gatewayUrl: data.hermes.gatewayUrl,
          authToken: data.hermes.authToken,
          model: data.hermes.model,
          tokenEdited: false,
        })
      })
      .catch((err) => toast.error('Failed to load settings: ' + err.message))
      .finally(() => setLoading(false))
  }, [])

  const saveProvider = useCallback(async (providerKey: 'openai' | 'anthropic' | 'zhipu' | 'gemini') => {
    const form = providerForms[providerKey]
    if (!form) return
    setSaving(providerKey)
    const update: ProviderUpdate = { model: form.model, baseURL: form.baseURL }
    if (form.keyEdited && form.apiKey) {
      update.apiKey = form.apiKey
    }
    try {
      const updated = await updateSettings({ providers: { [providerKey]: update } })
      setSettings(updated)
      const p = updated.providers[providerKey]
      setProviderForms((prev) => ({
        ...prev,
        [providerKey]: {
          ...prev[providerKey],
          apiKey: p.apiKey,
          model: p.model,
          baseURL: p.baseURL,
          keyEdited: false,
        },
      }))
      toast.success(`${PROVIDER_NAMES[providerKey]} settings saved`)
    } catch (err) {
      toast.error('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(null)
    }
  }, [providerForms])

  const saveHermes = useCallback(async () => {
    setSaving('hermes')
    const update: Record<string, string> = {
      gatewayUrl: hermesForm.gatewayUrl,
      model: hermesForm.model,
    }
    if (hermesForm.tokenEdited && hermesForm.authToken) {
      update.authToken = hermesForm.authToken
    }
    try {
      const updated = await updateSettings({ hermes: update })
      setSettings(updated)
      setHermesForm({
        gatewayUrl: updated.hermes.gatewayUrl,
        authToken: updated.hermes.authToken,
        model: updated.hermes.model,
        tokenEdited: false,
      })
      toast.success('Hermes settings saved')
    } catch (err) {
      toast.error('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(null)
    }
  }, [hermesForm])

  if (loading) return <div className="p-4 text-muted-foreground">Loading settings...</div>

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">Settings</span>
      </div>

      <div className="flex-1 overflow-auto p-4 max-w-3xl mx-auto w-full">
        <Tabs defaultValue="providers">
          <TabsList>
            <TabsTrigger value="providers">AI Providers</TabsTrigger>
            <TabsTrigger value="hermes">Hermes Agent</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4 mt-4">
            {PROVIDER_KEYS.map((key) => {
              const form = providerForms[key]
              const provider = settings?.providers[key]
              if (!form || !provider) return null
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>{PROVIDER_NAMES[key]}</CardTitle>
                    <CardAction>
                      <Badge variant={provider.configured ? 'default' : 'outline'}>
                        {provider.configured ? 'Configured' : 'Not configured'}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">API Key</label>
                      <Input
                        type="password"
                        value={form.apiKey}
                        placeholder={form.apiKey === '****' ? 'Enter new API key' : 'API key'}
                        onChange={(e) => {
                          setProviderForms((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], apiKey: e.target.value, keyEdited: true },
                          }))
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Model</label>
                      <Input
                        value={form.model}
                        onChange={(e) => {
                          setProviderForms((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], model: e.target.value },
                          }))
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Base URL</label>
                      <Input
                        value={form.baseURL}
                        placeholder="Default"
                        onChange={(e) => {
                          setProviderForms((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], baseURL: e.target.value },
                          }))
                        }}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      size="sm"
                      onClick={() => saveProvider(key)}
                      disabled={saving === key}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="hermes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Hermes Agent</CardTitle>
                <CardAction>
                  <Badge variant={settings?.hermes.configured ? 'default' : 'outline'}>
                    {settings?.hermes.configured ? 'Configured' : 'Not configured'}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Gateway URL</label>
                  <Input
                    value={hermesForm.gatewayUrl}
                    placeholder="https://hermes.example.com"
                    onChange={(e) => setHermesForm((prev) => ({ ...prev, gatewayUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Auth Token</label>
                  <Input
                    type="password"
                    value={hermesForm.authToken}
                    placeholder={hermesForm.authToken === '****' ? 'Enter new token' : 'Auth token'}
                    onChange={(e) => setHermesForm((prev) => ({ ...prev, authToken: e.target.value, tokenEdited: true }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Model</label>
                  <Input
                    value={hermesForm.model}
                    placeholder="Default model"
                    onChange={(e) => setHermesForm((prev) => ({ ...prev, model: e.target.value }))}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button size="sm" onClick={saveHermes} disabled={saving === 'hermes'}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Select your preferred theme
                </p>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <Button
                      key={t}
                      variant={theme === t ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Separator className="my-4" />

            <Card>
              <CardHeader>
                <CardTitle>Keyboard Shortcuts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Save file</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl+S</kbd>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open settings</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl+Shift+S</kbd>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
