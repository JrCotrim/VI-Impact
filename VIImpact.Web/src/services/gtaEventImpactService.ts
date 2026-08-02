import { buildApiUrl, fetchJson } from './apiClient'
import type { GtaEventImpact } from '../types/dashboard'

const IMPACT_CACHE_DURATION_MS =
  10 * 60 * 1000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const impactCache =
  new Map<string, CacheEntry<GtaEventImpact>>()

const rankingCache =
  new Map<string, CacheEntry<GtaEventImpact[]>>()

const impactRequests =
  new Map<string, Promise<GtaEventImpact>>()

const rankingRequests =
  new Map<string, Promise<GtaEventImpact[]>>()

function createMarketKey(
  symbol: string,
  benchmarkSymbol: string,
): string {
  return `${symbol}|${benchmarkSymbol}`
}

function createImpactKey(
  eventId: string,
  symbol: string,
  benchmarkSymbol: string,
): string {
  return (
    `${createMarketKey(symbol, benchmarkSymbol)}` +
    `|${eventId}`
  )
}

function readCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): T | null {
  const entry = cache.get(key)

  if (!entry) {
    return null
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }

  return entry.value
}

function writeCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
): void {
  cache.set(key, {
    value,
    expiresAt:
      Date.now() + IMPACT_CACHE_DURATION_MS,
  })
}

function cacheRankingImpacts(
  impacts: GtaEventImpact[],
  symbol: string,
  benchmarkSymbol: string,
): void {
  for (const impact of impacts) {
    const impactKey = createImpactKey(
      impact.eventId,
      symbol,
      benchmarkSymbol,
    )

    writeCache(
      impactCache,
      impactKey,
      impact,
    )
  }
}

function createAbortError(): DOMException {
  return new DOMException(
    'A operação foi cancelada.',
    'AbortError',
  )
}

function waitWithSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) {
    return promise
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError())
  }

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      reject(createAbortError())
    }

    signal.addEventListener(
      'abort',
      handleAbort,
      { once: true },
    )

    promise.then(
      (value) => {
        signal.removeEventListener(
          'abort',
          handleAbort,
        )

        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener(
          'abort',
          handleAbort,
        )

        reject(error)
      },
    )
  })
}

/**
 * Retrieves the observed stock-market movement associated with a GTA VI event.
 *
 * Results already returned by the ranking endpoint are reused here, avoiding
 * another pair of TTWO and QQQ provider requests when a timeline item opens.
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

  const marketKey = createMarketKey(
    normalizedSymbol,
    normalizedBenchmarkSymbol,
  )

  const impactKey = createImpactKey(
    normalizedEventId,
    normalizedSymbol,
    normalizedBenchmarkSymbol,
  )

  const cachedImpact =
    readCache(impactCache, impactKey)

  if (cachedImpact) {
    return cachedImpact
  }

  const cachedRanking =
    readCache(rankingCache, marketKey)

  const rankingImpact =
    cachedRanking?.find(
      impact =>
        impact.eventId === normalizedEventId,
    )

  if (rankingImpact) {
    writeCache(
      impactCache,
      impactKey,
      rankingImpact,
    )

    return rankingImpact
  }

  const pendingRanking =
    rankingRequests.get(marketKey)

  if (pendingRanking) {
    const ranking =
      await waitWithSignal(
        pendingRanking,
        signal,
      )

    const pendingRankingImpact =
      ranking.find(
        impact =>
          impact.eventId === normalizedEventId,
      )

    if (pendingRankingImpact) {
      return pendingRankingImpact
    }
  }

  const pendingImpact =
    impactRequests.get(impactKey)

  if (pendingImpact) {
    return waitWithSignal(
      pendingImpact,
      signal,
    )
  }

  const searchParameters =
    new URLSearchParams({
      symbol: normalizedSymbol,
      benchmarkSymbol:
        normalizedBenchmarkSymbol,
    })

  const endpoint = buildApiUrl(
    `/api/gtaevents/` +
      `${encodeURIComponent(normalizedEventId)}/impact` +
      `?${searchParameters.toString()}`,
  )

  const request = fetchJson<GtaEventImpact>(
    endpoint,
    undefined,
    'Não foi possível calcular o movimento observado.',
  )
    .then((impact) => {
      writeCache(
        impactCache,
        impactKey,
        impact,
      )

      return impact
    })
    .finally(() => {
      impactRequests.delete(impactKey)
    })

  impactRequests.set(
    impactKey,
    request,
  )

  return waitWithSignal(
    request,
    signal,
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

  const marketKey = createMarketKey(
    normalizedSymbol,
    normalizedBenchmarkSymbol,
  )

  const cachedRanking =
    readCache(rankingCache, marketKey)

  if (cachedRanking) {
    return cachedRanking
  }

  const pendingRanking =
    rankingRequests.get(marketKey)

  if (pendingRanking) {
    return waitWithSignal(
      pendingRanking,
      signal,
    )
  }

  const searchParameters =
    new URLSearchParams({
      symbol: normalizedSymbol,
      benchmarkSymbol:
        normalizedBenchmarkSymbol,
    })

  const endpoint = buildApiUrl(
    `/api/gtaevents/impact-ranking` +
      `?${searchParameters.toString()}`,
  )

  const request = fetchJson<GtaEventImpact[]>(
    endpoint,
    undefined,
    'Não foi possível carregar o ranking de impacto.',
  )
    .then((ranking) => {
      writeCache(
        rankingCache,
        marketKey,
        ranking,
      )

      cacheRankingImpacts(
        ranking,
        normalizedSymbol,
        normalizedBenchmarkSymbol,
      )

      return ranking
    })
    .finally(() => {
      rankingRequests.delete(marketKey)
    })

  rankingRequests.set(
    marketKey,
    request,
  )

  return waitWithSignal(
    request,
    signal,
  )
}
