import { buildApiUrl, fetchJson } from './apiClient'
import type { DashboardData } from '../types/dashboard'


export async function getDashboardData(
  includeGtaEvents = true,
  limit = 100,
  signal?: AbortSignal,
): Promise<DashboardData> {
  const endpoint = buildApiUrl(
    `/api/dashboard/TTWO` +
      `?includeGtaEvents=${includeGtaEvents}` +
      `&limit=${limit}`,
  )

  return fetchJson<DashboardData>(
    endpoint,
    { signal },
    'Não foi possível carregar o dashboard.',
  )
}