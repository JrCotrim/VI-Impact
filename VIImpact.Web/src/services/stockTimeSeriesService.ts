import { buildApiUrl, fetchJson } from './apiClient'
import type {
  StockTimeSeries,
  StockTimeSeriesPeriod,
} from '../types/dashboard'


interface GetStockTimeSeriesOptions {
  period: StockTimeSeriesPeriod
  startDate?: string
  endDate?: string
  signal?: AbortSignal
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

  const endpoint = buildApiUrl(
    `/api/stocks/` +
      `${encodeURIComponent(normalizedSymbol)}/time-series` +
      `?${searchParameters.toString()}`,
  )

  return fetchJson<StockTimeSeries>(
    endpoint,
    { signal: options.signal },
    'Não foi possível carregar o histórico de cotações.',
  )
}