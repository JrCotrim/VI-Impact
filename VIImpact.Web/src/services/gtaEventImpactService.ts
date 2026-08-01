import { fetchJson } from './apiClient'
import type { GtaEventImpact } from '../types/dashboard'

const apiBaseUrl = 'http://localhost:5170'

/**
 * Retrieves the observed stock-market movement associated with a GTA VI event.
 */
export async function getGtaEventImpact(
  eventId: string,
  symbol = 'TTWO',
  benchmarkSymbol = 'QQQ',
  signal?: AbortSignal,
): Promise<GtaEventImpact> {
  const normalizedEventId = eventId.trim()
  const normalizedSymbol =
    symbol.trim().toUpperCase()

  const normalizedBenchmarkSymbol =
    benchmarkSymbol.trim().toUpperCase()

  if (!normalizedEventId) {
    throw new Error(
      'O identificador do evento é obrigatório.',
    )
  }

  if (!normalizedSymbol) {
    throw new Error(
      'O símbolo da ação é obrigatório.',
    )
  }

  if (!normalizedBenchmarkSymbol) {
    throw new Error(
      'O símbolo do benchmark é obrigatório.',
    )
  }

  const searchParameters =
    new URLSearchParams({
      symbol: normalizedSymbol,
      benchmarkSymbol:
        normalizedBenchmarkSymbol,
    })

  const endpoint =
    `${apiBaseUrl}/api/gtaevents/` +
    `${encodeURIComponent(normalizedEventId)}/impact` +
    `?${searchParameters.toString()}`

  return fetchJson<GtaEventImpact>(
    endpoint,
    { signal },
    'Não foi possível calcular o movimento observado.',
  )
}

/**
 * Retrieves the observed market impact for all eligible occurred events.
 * The API shares the same TTWO and QQQ historical series between calculations.
 */
export async function getGtaEventImpactRanking(
  symbol = 'TTWO',
  benchmarkSymbol = 'QQQ',
  signal?: AbortSignal,
): Promise<GtaEventImpact[]> {
  const normalizedSymbol =
    symbol.trim().toUpperCase()

  const normalizedBenchmarkSymbol =
    benchmarkSymbol.trim().toUpperCase()

  if (!normalizedSymbol) {
    throw new Error(
      'O símbolo da ação é obrigatório.',
    )
  }

  if (!normalizedBenchmarkSymbol) {
    throw new Error(
      'O símbolo do benchmark é obrigatório.',
    )
  }

  const searchParameters =
    new URLSearchParams({
      symbol: normalizedSymbol,
      benchmarkSymbol:
        normalizedBenchmarkSymbol,
    })

  const endpoint =
    `${apiBaseUrl}/api/gtaevents/impact-ranking` +
    `?${searchParameters.toString()}`

  return fetchJson<GtaEventImpact[]>(
    endpoint,
    { signal },
    'Não foi possível carregar o ranking de impacto.',
  )
}