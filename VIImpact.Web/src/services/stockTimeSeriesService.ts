import type {
  StockTimeSeries,
  StockTimeSeriesPeriod,
} from '../types/dashboard'

const apiBaseUrl = 'http://localhost:5170'

interface GetStockTimeSeriesOptions {
  period: StockTimeSeriesPeriod
  startDate?: string
  endDate?: string
  signal?: AbortSignal
}

interface ApiErrorResponse {
  message?: string
  detail?: string
  title?: string
}

async function getErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const errorResponse =
      (await response.json()) as ApiErrorResponse

    return (
      errorResponse.message ??
      errorResponse.detail ??
      errorResponse.title ??
      `A API retornou o status ${response.status}.`
    )
  } catch {
    return `A API retornou o status ${response.status}.`
  }
}

export async function getStockTimeSeries(
  symbol: string,
  options: GetStockTimeSeriesOptions,
): Promise<StockTimeSeries> {
  const normalizedSymbol =
    symbol.trim().toUpperCase()

  if (!normalizedSymbol) {
    throw new Error(
      'O símbolo da ação é obrigatório.',
    )
  }

  const searchParameters =
    new URLSearchParams({
      period: options.period,
    })

  if (options.period === 'CUSTOM') {
    if (
      !options.startDate ||
      !options.endDate
    ) {
      throw new Error(
        'As datas inicial e final são obrigatórias.',
      )
    }

    searchParameters.set(
      'startDate',
      options.startDate,
    )

    searchParameters.set(
      'endDate',
      options.endDate,
    )
  }

  const endpoint =
    `${apiBaseUrl}/api/stocks/` +
    `${encodeURIComponent(normalizedSymbol)}/time-series` +
    `?${searchParameters.toString()}`

  const response = await fetch(endpoint, {
    signal: options.signal,
  })

  if (!response.ok) {
    const message =
      await getErrorMessage(response)

    throw new Error(message)
  }

  return response.json() as Promise<StockTimeSeries>
}