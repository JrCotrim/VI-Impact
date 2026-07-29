import { useEffect, useState } from 'react'
import './App.css'
import { StockChart } from './components/StockChart'
import { getDashboardData } from './services/dashboardService'
import type {
  DashboardData,
  StockQuote,
} from './types/dashboard'

type Theme = 'day' | 'night'

function getInitialTheme(): Theme {
  const savedTheme = localStorage.getItem('vi-impact-theme')

  return savedTheme === 'night' ? 'night' : 'day'
}

function parseUtcDate(dateText: string): Date {
  const hasTimezone =
    dateText.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(dateText)

  const normalizedDate = hasTimezone
    ? dateText
    : `${dateText}Z`

  return new Date(normalizedDate)
}

function formatDate(dateText: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parseUtcDate(dateText))
}

function getLatestQuote(
  quotes: StockQuote[],
): StockQuote {
  return quotes.reduce((latestQuote, currentQuote) => {
    const latestTimestamp = parseUtcDate(
      latestQuote.recordedAtUtc,
    ).getTime()

    const currentTimestamp = parseUtcDate(
      currentQuote.recordedAtUtc,
    ).getTime()

    return currentTimestamp > latestTimestamp
      ? currentQuote
      : latestQuote
  })
}

function App() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null)

  const [theme, setTheme] =
    useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('vi-impact-theme', theme)
  }, [theme])

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    async function loadDashboard() {
      try {
        setIsLoading(true)
        setErrorMessage(null)

        const data = await getDashboardData(
          true,
          100,
          controller.signal,
        )

        if (isActive) {
          setDashboard(data)
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return
        }

        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Ocorreu um erro inesperado.',
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'day' ? 'night' : 'day',
    )
  }

  if (isLoading) {
    return (
      <main className="status-screen">
        <p>Carregando dados do VI Impact...</p>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="status-screen">
        <p>Erro: {errorMessage}</p>
      </main>
    )
  }

  if (!dashboard || dashboard.quotes.length === 0) {
    return (
      <main className="status-screen">
        <p>Nenhuma cotação disponível.</p>
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
          <span className="brand-symbol">VI</span>
          <span className="brand-name">Impact</span>
        </div>

        <nav className="sidebar-navigation">
          <a
            className="navigation-link active"
            href="#dashboard"
          >
            Dashboard
          </a>

          <a className="navigation-link" href="#chart">
            Gráfico
          </a>

          <a className="navigation-link" href="#events">
            Eventos
          </a>

          <a className="navigation-link" href="#impact">
            Impacto
          </a>

          <a className="navigation-link" href="#history">
            Histórico
          </a>
        </nav>

        <div className="market-status">
          <span>Mercado</span>
          <strong>NASDAQ · Aberto</strong>
        </div>
      </aside>

      <main className="dashboard" id="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">
              VI Impact Dashboard
            </p>

            <h1>
              Eventos do GTA VI e o desempenho da TTWO
            </h1>

            <p className="dashboard-description">
              Acompanhe possíveis relações entre notícias do
              GTA VI e as ações da Take-Two Interactive.
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
              US$ {latestQuote.price.toFixed(2)}
            </strong>

            <small>{dashboard.symbol}</small>
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
              {latestQuote.changePercent.toFixed(2)}%
            </strong>

            <small>Última cotação</small>
          </article>

          <article className="summary-card">
            <span>Volume</span>

            <strong>
              {latestQuote.volume.toLocaleString('pt-BR')}
            </strong>

            <small>Ações negociadas</small>
          </article>

          <article className="summary-card">
            <span>Última atualização</span>

            <strong className="date-value">
              {formatDate(latestQuote.recordedAtUtc)}
            </strong>

            <small>Horário local</small>
          </article>
        </section>

        <section className="dashboard-content">
          <article className="chart-panel" id="chart">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  {dashboard.symbol}
                </p>

                <h2>
                  Histórico da ação e eventos do GTA VI
                </h2>
              </div>
            </div>

            <StockChart
              quotes={dashboard.quotes}
              events={dashboard.gtaEvents}
            />
          </article>

          <aside className="events-panel" id="events">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  Linha do tempo
                </p>

                <h2>Eventos recentes</h2>
              </div>
            </div>

            <div className="events-list">
              {dashboard.gtaEvents.length > 0 ? (
                dashboard.gtaEvents.map((gtaEvent) => (
                  <article
                    className="event-card"
                    key={gtaEvent.id}
                  >
                    <span className="event-date">
                      {formatDate(
                        gtaEvent.occurredAtUtc,
                      )}
                    </span>

                    <h3>{gtaEvent.title}</h3>

                    <p>{gtaEvent.description}</p>

                    <a
                      href={gtaEvent.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver fonte
                    </a>
                  </article>
                ))
              ) : (
                <article className="event-card">
                  <h3>Nenhum evento cadastrado</h3>

                  <p>
                    Ainda não existem eventos relacionados ao
                    GTA VI para este período.
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