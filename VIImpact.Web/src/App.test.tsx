import { act, render, screen, waitFor, within } from '@testing-library/react'
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


const SITE_URL = 'https://vi-impact.vercel.app'
const DASHBOARD_TITLE = 'VI Impact — GTA VI × Take-Two (TTWO)'
const DASHBOARD_DESCRIPTION =
  'Acompanhe eventos públicos de GTA VI e movimentos observados da Take-Two (TTWO), com comparação ao Nasdaq-100 (QQQ), linha do tempo e análise de impacto.'

function getMetaContent(selector: string): string | null {
  return document.head
    .querySelector<HTMLMetaElement>(selector)
    ?.getAttribute('content') ?? null
}

function getCanonicalHref(): string | null {
  return document.head
    .querySelector<HTMLLinkElement>('link[rel="canonical"]')
    ?.href ?? null
}

function getStructuredData(): Record<string, unknown> | null {
  const text = document.head.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )?.textContent

  return text ? JSON.parse(text) : null
}

describe('App regression flows', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    configureSuccessfulServices()
  })

  it('defers impact ranking until dashboard data is available', async () => {
    let resolveDashboard:
      | ((
          dashboardData: ReturnType<
            typeof createDashboardData
          >,
        ) => void)
      | undefined

    const dashboardPromise =
      new Promise<
        ReturnType<typeof createDashboardData>
      >((resolve) => {
        resolveDashboard = resolve
      })

    getDashboardDataMock.mockReturnValueOnce(
      dashboardPromise,
    )

    render(<App />)

    await waitFor(() => {
      expect(
        getDashboardDataMock,
      ).toHaveBeenCalledTimes(1)

      expect(
        getStockTimeSeriesMock,
      ).toHaveBeenCalled()
    })

    expect(
      getGtaEventImpactRankingMock,
    ).not.toHaveBeenCalled()

    await act(async () => {
      resolveDashboard?.(createDashboardData())
    })

    await waitFor(() => {
      expect(
        getGtaEventImpactRankingMock,
      ).toHaveBeenCalledTimes(1)
    })
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

  it('synchronizes event metadata when the full analysis opens client-side', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    const canonicalUrl = `${SITE_URL}/events/${occurredEvent.slug}`
    const expectedTitle = `${occurredEvent.title} — VI Impact`

    await waitFor(() => {
      expect(document.title).toBe(expectedTitle)
    })

    expect(
      getMetaContent('meta[name="description"]'),
    ).toBe(occurredEvent.summary)
    expect(getCanonicalHref()).toBe(canonicalUrl)
    expect(
      getMetaContent('meta[property="og:title"]'),
    ).toBe(expectedTitle)
    expect(
      getMetaContent('meta[property="og:description"]'),
    ).toBe(occurredEvent.summary)
    expect(
      getMetaContent('meta[property="og:url"]'),
    ).toBe(canonicalUrl)
    expect(
      getMetaContent('meta[name="twitter:title"]'),
    ).toBe(expectedTitle)
    expect(
      getMetaContent('meta[name="twitter:description"]'),
    ).toBe(occurredEvent.summary)
    expect(getStructuredData()).toMatchObject({
      '@type': 'WebPage',
      name: expectedTitle,
      description: occurredEvent.summary,
      url: canonicalUrl,
    })
  })

  it('restores dashboard metadata when the full analysis closes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    await user.click(
      screen.getAllByRole('button', {
        name: 'Voltar ao dashboard',
      })[0],
    )

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
      expect(document.title).toBe(DASHBOARD_TITLE)
    })

    expect(
      getMetaContent('meta[name="description"]'),
    ).toBe(DASHBOARD_DESCRIPTION)
    expect(getCanonicalHref()).toBe(`${SITE_URL}/`)
    expect(
      getMetaContent('meta[property="og:title"]'),
    ).toBe(DASHBOARD_TITLE)
    expect(
      getMetaContent('meta[property="og:description"]'),
    ).toBe(DASHBOARD_DESCRIPTION)
    expect(
      getMetaContent('meta[property="og:url"]'),
    ).toBe(`${SITE_URL}/`)
    expect(getStructuredData()).toMatchObject({
      '@type': 'WebSite',
      name: 'VI Impact',
      url: `${SITE_URL}/`,
      description: DASHBOARD_DESCRIPTION,
    })
  })

  it('keeps metadata synchronized with browser history navigation', async () => {
    window.history.replaceState(
      {},
      '',
      `/events/${occurredEvent.slug}`,
    )

    render(<App />)

    await screen.findByRole('heading', {
      name: occurredEvent.title,
      level: 1,
    })

    const eventTitle = `${occurredEvent.title} — VI Impact`
    const eventCanonicalUrl = `${SITE_URL}/events/${occurredEvent.slug}`

    await waitFor(() => {
      expect(document.title).toBe(eventTitle)
      expect(getCanonicalHref()).toBe(eventCanonicalUrl)
    })

    act(() => {
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => {
      expect(document.title).toBe(DASHBOARD_TITLE)
      expect(getCanonicalHref()).toBe(`${SITE_URL}/`)
    })

    act(() => {
      window.history.replaceState(
        {},
        '',
        `/events/${occurredEvent.slug}`,
      )
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => {
      expect(document.title).toBe(eventTitle)
      expect(getCanonicalHref()).toBe(eventCanonicalUrl)
    })
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

  it('labels recent-event horizons as pending until enough trading sessions exist', async () => {
    const user = userEvent.setup()

    getGtaEventImpactMock.mockResolvedValue({
      ...createEventImpact(),
      day1TradingDate: null,
      day1Close: null,
      day1ReturnPercent: null,
      day5TradingDate: null,
      day5Close: null,
      day5ReturnPercent: null,
      day30TradingDate: null,
      day30Close: null,
      day30ReturnPercent: null,
      benchmarkDay1Close: null,
      benchmarkDay1ReturnPercent: null,
      benchmarkDay5Close: null,
      benchmarkDay5ReturnPercent: null,
      benchmarkDay30Close: null,
      benchmarkDay30ReturnPercent: null,
      day1ExcessReturnPercent: null,
      day5ExcessReturnPercent: null,
      day30ExcessReturnPercent: null,
    })

    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    expect(
      await screen.findByText(
        'Aguardando 1 pregão completo',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Aguardando 5 pregões completos',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Aguardando 30 pregões completos',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /“Pendente” indica horizonte ainda em formação/,
      ),
    ).toBeInTheDocument()
  })

  it('treats a recent event awaiting its first trading session as pending', async () => {
    const user = userEvent.setup()

    getGtaEventImpactMock.mockResolvedValue({
      ...createEventImpact(),
      analysisTimestampUtc: '2026-08-22T00:00:00Z',
      isAvailable: false,
      unavailableReason:
        'Não foi possível localizar um pregão anterior e um pregão efetivo completos.',
      effectiveTradingDate: null,
      previousTradingDate: null,
      previousClose: null,
      eventDayOpen: null,
      eventDayClose: null,
      eventDayVolume: null,
      sameDayReturnPercent: null,
    })

    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    expect(
      await screen.findByText('Métricas em formação'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Aguardando o primeiro pregão completo após o evento.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Dados de mercado indisponíveis'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'A leitura de mercado começará após o primeiro pregão completo posterior ao evento.',
      ),
    ).toBeInTheDocument()
  })

  it('distinguishes unavailable market data from pending horizons', async () => {
    const user = userEvent.setup()
    const unavailableReason =
      'Não foi possível localizar um pregão efetivo completo.'

    getGtaEventImpactMock.mockResolvedValue({
      ...createEventImpact(),
      isAvailable: false,
      unavailableReason,
    })

    render(<App />)

    await waitForDashboard()
    await openFullEventAnalysis(user)

    const unavailableStateTitle =
      await screen.findByText(
        'Dados de mercado indisponíveis',
      )
    const unavailableStateCard =
      unavailableStateTitle.parentElement

    expect(unavailableStateCard).not.toBeNull()
    expect(
      within(unavailableStateCard!).getByText(
        unavailableReason,
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'Aguardando 5 pregões completos',
      ),
    ).not.toBeInTheDocument()
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
