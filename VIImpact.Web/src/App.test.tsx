import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ApiRequestError } from './services/apiClient'
import { getDashboardData } from './services/dashboardService'
import {
  getGtaEventImpact,
  getGtaEventImpactRanking,
} from './services/gtaEventImpactService'
import { getStockTimeSeries } from './services/stockTimeSeriesService'
import {
  createDashboardData,
  createEventImpact,
  createStockTimeSeries,
  occurredEvent,
  scheduledEvent,
} from './test/fixtures'

vi.mock('./services/dashboardService', () => ({
  getDashboardData: vi.fn(),
}))

vi.mock('./services/gtaEventImpactService', () => ({
  getGtaEventImpact: vi.fn(),
  getGtaEventImpactRanking: vi.fn(),
}))

vi.mock('./services/stockTimeSeriesService', () => ({
  getStockTimeSeries: vi.fn(),
}))

vi.mock('./components/StockChart', () => ({
  StockChart: () => (
    <div aria-label="Gráfico de cotações simulado" />
  ),
}))

const getDashboardDataMock = vi.mocked(
  getDashboardData,
)
const getStockTimeSeriesMock = vi.mocked(
  getStockTimeSeries,
)
const getGtaEventImpactMock = vi.mocked(
  getGtaEventImpact,
)
const getGtaEventImpactRankingMock = vi.mocked(
  getGtaEventImpactRanking,
)

function configureSuccessfulServices() {
  getDashboardDataMock.mockResolvedValue(
    createDashboardData(),
  )
  getStockTimeSeriesMock.mockImplementation(
    async (_symbol, options) =>
      createStockTimeSeries(options.period),
  )
  getGtaEventImpactMock.mockResolvedValue(
    createEventImpact(),
  )
  getGtaEventImpactRankingMock.mockResolvedValue([])
}

async function waitForDashboard() {
  return screen.findByRole('heading', {
    name: 'Take-Two Interactive (TTWO)',
  })
}

async function openEventPreview(
  user: ReturnType<typeof userEvent.setup>,
) {
  const eventButton = await screen.findByRole(
    'button',
    {
      name: new RegExp(occurredEvent.title),
    },
  )

  await user.click(eventButton)

  await screen.findByText(occurredEvent.summary!)
}

async function openFullEventAnalysis(
  user: ReturnType<typeof userEvent.setup>,
) {
  await openEventPreview(user)
  await user.click(
    screen.getByRole('button', {
      name: /Ver análise completa/,
    }),
  )

  await screen.findByRole('heading', {
    name: occurredEvent.title,
    level: 1,
  })
}

describe('App regression flows', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    configureSuccessfulServices()
  })

  it('shows occurred events and keeps scheduled events out of the dashboard', async () => {
    render(<App />)

    await waitForDashboard()

    expect(
      screen.getByText(occurredEvent.title),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(scheduledEvent.title),
    ).not.toBeInTheDocument()
  })

  it('uses Summary in the preview and Description in the full analysis', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForDashboard()
    await openEventPreview(user)

    expect(
      screen.getByText(occurredEvent.summary!),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(occurredEvent.description),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: /Ver análise completa/,
      }),
    )

    expect(
      await screen.findByText(occurredEvent.description),
    ).toBeInTheDocument()
  })

  it('navigates to the canonical /events/<slug> URL when the full analysis opens', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    expect(window.location.pathname).toBe(
      `/events/${occurredEvent.slug}`,
    )
  })

  it('shows the TTWO versus QQQ benchmark comparison in the full analysis', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    expect(
      await screen.findByText('TTWO × QQQ'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', {
        name: 'TTWO',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', {
        name: 'QQQ',
      }),
    ).toBeInTheDocument()
  })

  it('allows retrying a recoverable dashboard error and renders the dashboard after success', async () => {
    const user = userEvent.setup()
    const recoverableError = new ApiRequestError({
      status: 503,
      title: 'Dados temporariamente indisponíveis',
      message: 'Falha temporária usada pelo teste.',
      errorCode: 'provider_unavailable',
    })

    getDashboardDataMock
      .mockRejectedValueOnce(recoverableError)
      .mockResolvedValueOnce(createDashboardData())

    render(<App />)

    expect(
      await screen.findByText(
        'Falha temporária usada pelo teste.',
      ),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Tentar novamente',
      }),
    )

    await waitForDashboard()

    await waitFor(() => {
      expect(getDashboardDataMock).toHaveBeenCalledTimes(
        2,
      )
    })
  })

  it('copies the canonical event analysis URL', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })

    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    await user.click(
      screen.getByRole('button', {
        name: 'Copiar link da análise',
      }),
    )

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/events/${occurredEvent.slug}`,
    )
    expect(
      await screen.findByText('Link copiado'),
    ).toBeInTheDocument()
  })

  it('uses the native share sheet when it is available', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    })

    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    await user.click(
      screen.getByRole('button', {
        name: `Compartilhar análise: ${occurredEvent.title}`,
      }),
    )

    expect(share).toHaveBeenCalledWith({
      text: `${occurredEvent.title} — VI Impact\nVeja a análise do evento e a reação da TTWO:\n${window.location.origin}/events/${occurredEvent.slug}`,
    })
    expect(
      await screen.findByText('Compartilhado'),
    ).toBeInTheDocument()
  })
})
