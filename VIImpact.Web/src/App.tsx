import { useEffect, useState } from 'react'
import './App.css'
import { getDashboardData } from './services/dashboardService'
import type { DashboardData } from './types/dashboard'

function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      try {
        setIsLoading(true)
        setErrorMessage(null)

        const data = await getDashboardData(
          true,
          100,
          controller.signal,
        )

        setDashboard(data)
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro inesperado.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      controller.abort()
    }
  }, [])

  if (isLoading) {
    return (
      <main>
        <p>Carregando dados do VI Impact...</p>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main>
        <p>Erro: {errorMessage}</p>
      </main>
    )
  }

  if (!dashboard || dashboard.quotes.length === 0) {
    return (
      <main>
        <p>Nenhuma cotação disponível.</p>
      </main>
    )
  }

  const latestQuote =
    dashboard.quotes[dashboard.quotes.length - 1]

  return (
    <main>
      <h1>VI Impact</h1>

      <p>
        Análise da relação entre eventos do GTA VI e as ações da
        Take-Two Interactive.
      </p>

      <section>
        <h2>{dashboard.symbol}</h2>

        <p>
          Preço atual: US$ {latestQuote.price.toFixed(2)}
        </p>

        <p>
          Variação: {latestQuote.changePercent.toFixed(2)}%
        </p>

        <p>
          Volume: {latestQuote.volume.toLocaleString('pt-BR')}
        </p>

        <p>
          Cotações carregadas: {dashboard.quotes.length}
        </p>

        <p>
          Eventos do GTA VI: {dashboard.gtaEvents.length}
        </p>
      </section>
    </main>
  )
}

export default App