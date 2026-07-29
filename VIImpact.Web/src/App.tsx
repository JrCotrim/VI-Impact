import {
  useEffect,
  useState,
} from 'react'
import './App.css'
import { ChartPeriodSelector } from './components/ChartPeriodSelector'
import { StockChart } from './components/StockChart'
import { getDashboardData } from './services/dashboardService'
import { getStockTimeSeries } from './services/stockTimeSeriesService'
import type {
  DashboardData,
  StockPeriodPerformance,
  StockQuote,
  StockTimeSeries,
  StockTimeSeriesPeriod,
} from './types/dashboard'

type Theme = 'day' | 'night'

const performancePeriodOrder: StockTimeSeriesPeriod[] = [
  '1D',
  '7D',
  '1M',
  '3M',
  '6M',
  'YTD',
  '1Y',
  '2Y',
  '5Y',
  'MAX',
]

const longPerformancePeriods =
  new Set<StockTimeSeriesPeriod>([
    '1D',
    '7D',
    '1M',
    '3M',
    '6M',
    'YTD',
    '1Y',
    '2Y',
    '5Y',
  ])

function getReliablePerformancePeriods(
  requestedPeriod: StockTimeSeriesPeriod,
): Set<StockTimeSeriesPeriod> {
  if (requestedPeriod === '1D') {
    return new Set<StockTimeSeriesPeriod>([
      '1D',
    ])
  }

  if (requestedPeriod === '7D') {
    return new Set<StockTimeSeriesPeriod>([
      '7D',
    ])
  }

  if (requestedPeriod === 'MAX') {
    return new Set<StockTimeSeriesPeriod>([
      'MAX',
    ])
  }

  if (requestedPeriod === 'CUSTOM') {
    return new Set<StockTimeSeriesPeriod>()
  }

  return longPerformancePeriods
}

function mergePeriodPerformances(
  currentPerformances: StockPeriodPerformance[],
  incomingPerformances: StockPeriodPerformance[],
  requestedPeriod: StockTimeSeriesPeriod,
): StockPeriodPerformance[] {
  const reliablePeriods =
    getReliablePerformancePeriods(
      requestedPeriod,
    )

  const performancesByPeriod = new Map(
    currentPerformances.map(
      (performance) => [
        performance.period,
        performance.changePercent,
      ],
    ),
  )

  incomingPerformances.forEach(
    (performance) => {
      if (
        reliablePeriods.has(
          performance.period,
        ) &&
        performance.changePercent !== null
      ) {
        performancesByPeriod.set(
          performance.period,
          performance.changePercent,
        )
      }
    },
  )

  return performancePeriodOrder.flatMap(
    (period) => {
      const changePercent =
        performancesByPeriod.get(period)

      if (changePercent === undefined) {
        return []
      }

      return [
        {
          period,
          changePercent,
        },
      ]
    },
  )
}

function getInitialTheme(): Theme {
  const savedTheme =
    localStorage.getItem('vi-impact-theme')

  return savedTheme === 'night'
    ? 'night'
    : 'day'
}

function parseUtcDate(dateText: string): Date {
  const hasTimezone =
    dateText.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(dateText)

  return new Date(
    hasTimezone
      ? dateText
      : `${dateText}Z`,
  )
}

function formatDate(dateText: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parseUtcDate(dateText))
}

function toDateInputValue(
  date: Date,
): string {
  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60 *
        1000,
  )

  return localDate
    .toISOString()
    .slice(0, 10)
}

function createInitialCustomRange() {
  const endDate = new Date()
  const startDate = new Date(endDate)

  startDate.setMonth(
    startDate.getMonth() - 1,
  )

  return {
    startDate:
      toDateInputValue(startDate),
    endDate:
      toDateInputValue(endDate),
  }
}

function getLatestQuote(
  quotes: StockQuote[],
): StockQuote {
  return quotes.reduce(
    (latestQuote, currentQuote) => {
      const latestTimestamp =
        parseUtcDate(
          latestQuote.recordedAtUtc,
        ).getTime()

      const currentTimestamp =
        parseUtcDate(
          currentQuote.recordedAtUtc,
        ).getTime()

      return currentTimestamp >
        latestTimestamp
        ? currentQuote
        : latestQuote
    },
  )
}

const initialCustomRange =
  createInitialCustomRange()

function App() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [timeSeries, setTimeSeries] =
    useState<StockTimeSeries | null>(null)

  const [
    periodPerformances,
    setPeriodPerformances,
  ] = useState<StockPeriodPerformance[]>([])

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] = useState<StockTimeSeriesPeriod>('1Y')

  const [
    customStartDate,
    setCustomStartDate,
  ] = useState(
    initialCustomRange.startDate,
  )

  const [
    customEndDate,
    setCustomEndDate,
  ] = useState(
    initialCustomRange.endDate,
  )

  const [
    appliedCustomStartDate,
    setAppliedCustomStartDate,
  ] = useState(
    initialCustomRange.startDate,
  )

  const [
    appliedCustomEndDate,
    setAppliedCustomEndDate,
  ] = useState(
    initialCustomRange.endDate,
  )

  const [
    isDashboardLoading,
    setIsDashboardLoading,
  ] = useState(true)

  const [
    isChartLoading,
    setIsChartLoading,
  ] = useState(true)

  const [
    dashboardError,
    setDashboardError,
  ] = useState<string | null>(null)

  const [
    chartError,
    setChartError,
  ] = useState<string | null>(null)

  const [theme, setTheme] =
    useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme

    localStorage.setItem(
      'vi-impact-theme',
      theme,
    )
  }, [theme])

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      try {
        const dashboardData =
          await getDashboardData(
            true,
            100,
          )

        if (isActive) {
          setDashboard(dashboardData)
        }
      } catch (error) {
        if (isActive) {
          setDashboardError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar o dashboard.',
          )
        }
      } finally {
        if (isActive) {
          setIsDashboardLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const timeoutId =
      window.setTimeout(() => {
        async function loadTimeSeries() {
          try {
            const timeSeriesData =
              await getStockTimeSeries(
                'TTWO',
                {
                  period:
                    selectedPeriod,

                  startDate:
                    selectedPeriod ===
                    'CUSTOM'
                      ? appliedCustomStartDate
                      : undefined,

                  endDate:
                    selectedPeriod ===
                    'CUSTOM'
                      ? appliedCustomEndDate
                      : undefined,
                },
              )

            if (isActive) {
              setPeriodPerformances(
                (currentPerformances) =>
                  mergePeriodPerformances(
                    currentPerformances,
                    timeSeriesData.performances,
                    selectedPeriod,
                  ),
              )

              setTimeSeries(
                timeSeriesData,
              )
            }
          } catch (error) {
            if (isActive) {
              setChartError(
                error instanceof Error
                  ? error.message
                  : 'Não foi possível carregar o histórico.',
              )
            }
          } finally {
            if (isActive) {
              setIsChartLoading(false)
            }
          }
        }

        void loadTimeSeries()
      }, 250)

    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [
    selectedPeriod,
    appliedCustomStartDate,
    appliedCustomEndDate,
  ])

  function prepareChartReload() {
    setIsChartLoading(true)
    setChartError(null)
    setTimeSeries(null)
  }

  function handlePeriodChange(
    period: StockTimeSeriesPeriod,
  ) {
    if (period === selectedPeriod) {
      return
    }

    prepareChartReload()
    setSelectedPeriod(period)
  }

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'day'
        ? 'night'
        : 'day',
    )
  }

  function handleCustomDateChange(
    field: 'start' | 'end',
    value: string,
  ) {
    if (field === 'start') {
      setCustomStartDate(value)
      return
    }

    setCustomEndDate(value)
  }

  function handleApplyCustomPeriod() {
    const isSameCustomPeriod =
      selectedPeriod === 'CUSTOM' &&
      customStartDate ===
        appliedCustomStartDate &&
      customEndDate ===
        appliedCustomEndDate

    if (isSameCustomPeriod) {
      return
    }

    prepareChartReload()

    setAppliedCustomStartDate(
      customStartDate,
    )

    setAppliedCustomEndDate(
      customEndDate,
    )

    setSelectedPeriod('CUSTOM')
  }

  if (
    isDashboardLoading &&
    !dashboard
  ) {
    return (
      <main className="status-screen">
        <p>
          Carregando dados do VI Impact...
        </p>
      </main>
    )
  }

  if (dashboardError) {
    return (
      <main className="status-screen">
        <p>Erro: {dashboardError}</p>
      </main>
    )
  }

  if (
    !dashboard ||
    dashboard.quotes.length === 0
  ) {
    return (
      <main className="status-screen">
        <p>
          Nenhuma cotação disponível.
        </p>
      </main>
    )
  }

  const latestQuote =
    getLatestQuote(dashboard.quotes)

  const isPositive =
    latestQuote.changePercent >= 0

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-symbol">
            VI
          </span>

          <span className="brand-name">
            Impact
          </span>
        </div>

        <nav className="sidebar-navigation">
          <a
            className="navigation-link active"
            href="#dashboard"
          >
            Dashboard
          </a>

          <a
            className="navigation-link"
            href="#chart"
          >
            Gráfico
          </a>

          <a
            className="navigation-link"
            href="#events"
          >
            Eventos
          </a>

          <a
            className="navigation-link"
            href="#impact"
          >
            Impacto
          </a>

          <a
            className="navigation-link"
            href="#history"
          >
            Histórico
          </a>
        </nav>

        <div className="market-status">
          <span>Mercado</span>

          <strong>
            {timeSeries?.exchange ??
              'NASDAQ'}{' '}
            ·{' '}
            {timeSeries?.currency ??
              'USD'}
          </strong>
        </div>
      </aside>

      <main
        className="dashboard"
        id="dashboard"
      >
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">
              VI Impact Dashboard
            </p>

            <h1>
              Eventos do GTA VI e o desempenho
              da TTWO
            </h1>

            <p className="dashboard-description">
              Acompanhe possíveis relações entre
              notícias do GTA VI e as ações da
              Take-Two Interactive.
            </p>
          </div>

          <button
            className="theme-button"
            type="button"
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'day'
              ? '🌙 Vice City Night'
              : '☀️ Vice City Day'}
          </button>
        </header>

        <section className="summary-grid">
          <article className="summary-card">
            <span>Preço atual</span>

            <strong>
              US${' '}
              {latestQuote.price.toFixed(2)}
            </strong>

            <small>
              {dashboard.symbol}
            </small>
          </article>

          <article className="summary-card">
            <span>Variação</span>

            <strong
              className={
                isPositive
                  ? 'positive-value'
                  : 'negative-value'
              }
            >
              {isPositive ? '+' : ''}
              {latestQuote.changePercent.toFixed(
                2,
              )}
              %
            </strong>

            <small>Última cotação</small>
          </article>

          <article className="summary-card">
            <span>Volume</span>

            <strong>
              {latestQuote.volume.toLocaleString(
                'pt-BR',
              )}
            </strong>

            <small>
              Ações negociadas
            </small>
          </article>

          <article className="summary-card">
            <span>
              Última atualização
            </span>

            <strong className="date-value">
              {formatDate(
                latestQuote.recordedAtUtc,
              )}
            </strong>

            <small>Horário local</small>
          </article>
        </section>

        <section className="dashboard-content">
          <article
            className="chart-panel"
            id="chart"
          >
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  {timeSeries?.symbol ??
                    'TTWO'}{' '}
                  ·{' '}
                  {timeSeries?.exchange ??
                    'NASDAQ'}
                </p>

                <h2>
                  Histórico da ação e eventos
                  do GTA VI
                </h2>
              </div>
            </div>

            {isChartLoading && (
              <div className="chart-state-message">
                Carregando período...
              </div>
            )}

            {!isChartLoading &&
              chartError && (
                <div className="chart-state-message error">
                  Erro: {chartError}
                </div>
              )}

            {!isChartLoading &&
              !chartError &&
              timeSeries && (
                <StockChart
                  values={
                    timeSeries.values
                  }
                  events={
                    dashboard.gtaEvents
                  }
                />
              )}

            <ChartPeriodSelector
              selectedPeriod={
                selectedPeriod
              }
              customStartDate={
                customStartDate
              }
              customEndDate={
                customEndDate
              }
              isLoading={
                isChartLoading
              }
              performances={
                periodPerformances
              }
              onPeriodChange={
                handlePeriodChange
              }
              onCustomDateChange={
                handleCustomDateChange
              }
              onApplyCustomPeriod={
                handleApplyCustomPeriod
              }
            />
          </article>

          <aside
            className="events-panel"
            id="events"
          >
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  Linha do tempo
                </p>

                <h2>
                  Eventos recentes
                </h2>
              </div>
            </div>

            <div className="events-list">
              {dashboard.gtaEvents.length >
              0 ? (
                dashboard.gtaEvents.map(
                  (gtaEvent) => (
                    <article
                      className="event-card"
                      key={gtaEvent.id}
                    >
                      <span className="event-date">
                        {formatDate(
                          gtaEvent.occurredAtUtc,
                        )}
                      </span>

                      <h3>
                        {gtaEvent.title}
                      </h3>

                      <p>
                        {gtaEvent.description}
                      </p>

                      <a
                        href={
                          gtaEvent.sourceUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver fonte
                      </a>
                    </article>
                  ),
                )
              ) : (
                <article className="event-card">
                  <h3>
                    Nenhum evento cadastrado
                  </h3>

                  <p>
                    Ainda não existem eventos
                    relacionados ao GTA VI.
                  </p>
                </article>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default App