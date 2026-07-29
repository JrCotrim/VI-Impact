import type { StockTimeSeries } from '../types/dashboard'

const apiBaseUrl = 'http://localhost:5170'

export async function getStockTimeSeries(
  symbol: string,
  interval = '1day',
  outputSize = 365,
  signal?: AbortSignal,
): Promise<StockTimeSeries> {
  const normalizedSymbol = symbol.trim().toUpperCase()

  if (!normalizedSymbol) {
    throw new Error('O símbolo da ação é obrigatório.')
  }

  if (outputSize < 1 || outputSize > 5000) {
    throw new Error(
      'A quantidade de registros deve estar entre 1 e 5000.',
    )
  }

  const searchParameters = new URLSearchParams({
    interval,
    outputSize: outputSize.toString(),
  })

  const endpoint =
    `${apiBaseUrl}/api/stocks/` +
    `${encodeURIComponent(normalizedSymbol)}/time-series` +
    `?${searchParameters.toString()}`

  const response = await fetch(endpoint, { signal })

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar o histórico da ação. Status: ${response.status}`,
    )
  }

  return response.json() as Promise<StockTimeSeries>
}