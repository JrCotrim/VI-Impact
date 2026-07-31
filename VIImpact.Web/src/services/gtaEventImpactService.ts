import type { GtaEventImpact } from '../types/dashboard'

const apiBaseUrl = 'http://localhost:5170'

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

  const response = await fetch(endpoint, {
    signal,
  })

  if (!response.ok) {
    const message =
      await getErrorMessage(response)

    throw new Error(message)
  }

  return response.json() as Promise<GtaEventImpact>
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

  const response = await fetch(endpoint, {
    signal,
  })

  if (!response.ok) {
    const message =
      await getErrorMessage(response)

    throw new Error(message)
  }

  return response.json() as Promise<GtaEventImpact[]>
}