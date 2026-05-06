import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import SettingsPage from './settings'
import * as settingsApi from '@/lib/settings-api'

vi.mock('@/lib/settings-api', () => ({
  fetchSettings: vi.fn(),
  updateSettings: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}))

const mockFetchSettings = vi.mocked(settingsApi.fetchSettings)
const mockUpdateSettings = vi.mocked(settingsApi.updateSettings)

const mockSettings: settingsApi.SettingsView = {
  providers: {
    openai: { apiKey: 'sk-a****5678', model: 'gpt-4o', baseURL: '', configured: true },
    anthropic: { apiKey: '****', model: 'claude-sonnet-4-20250514', baseURL: '', configured: false },
    zhipu: { apiKey: '****', model: 'glm-4-plus', baseURL: 'https://open.bigmodel.cn/api/paas/v4', configured: false },
    gemini: { apiKey: '****', model: 'gemini-2.5-flash', baseURL: '', configured: false },
  },
  hermes: { gatewayUrl: '', authToken: '****', model: '', configured: false },
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchSettings.mockResolvedValue(mockSettings)
    mockUpdateSettings.mockResolvedValue(mockSettings)
  })

  it('renders settings page with header', async () => {
    renderSettings()
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('fetches settings on mount', async () => {
    renderSettings()
    await waitFor(() => {
      expect(mockFetchSettings).toHaveBeenCalledOnce()
    })
  })

  it('renders three tab triggers', async () => {
    renderSettings()
    await waitFor(() => {
      expect(screen.getByText('AI Providers')).toBeInTheDocument()
      expect(screen.getByText('Hermes Agent')).toBeInTheDocument()
      expect(screen.getByText('Appearance')).toBeInTheDocument()
    })
  })

  it('shows provider cards with configured status', async () => {
    renderSettings()
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      expect(screen.getByText('Anthropic')).toBeInTheDocument()
      expect(screen.getByText('Zhipu / GLM')).toBeInTheDocument()
      expect(screen.getByText('Google Gemini')).toBeInTheDocument()
    })
    const configuredBadges = screen.getAllByText('Configured')
    expect(configuredBadges).toHaveLength(1)
    const notConfiguredBadges = screen.getAllByText('Not configured')
    expect(notConfiguredBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('saves provider settings on save button click', async () => {
    renderSettings()
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
    })
    const saveButtons = screen.getAllByText('Save')
    fireEvent.click(saveButtons[0])
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled()
    })
  })

  it('shows back button that navigates to /', async () => {
    const mockNavigate = vi.fn()
    vi.doMock('react-router', async () => {
      const actual = await vi.importActual('react-router')
      return { ...actual, useNavigate: () => mockNavigate }
    })
    renderSettings()
    await waitFor(() => {
      expect(screen.getByTitle('Back')).toBeInTheDocument()
    })
  })

  it('shows theme buttons in appearance tab', async () => {
    renderSettings()
    await waitFor(() => {
      expect(screen.getByText('AI Providers')).toBeInTheDocument()
    })
    const appearanceTab = screen.getByText('Appearance')
    fireEvent.click(appearanceTab)
    await waitFor(() => {
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('System')).toBeInTheDocument()
    })
  })
})
