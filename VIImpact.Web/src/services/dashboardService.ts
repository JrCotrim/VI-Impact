import { fetchJson } from './apiClient'
import type { DashboardData } from '../types/dashboard'

const apiBaseUrl = 'http://localhost:5170'

export async function getDashboardData(
  includeGtaEvents = true,
  limit = 100,
  signal?: AbortSignal,
): Promise<DashboardData> {
  const endpoint =
    `${apiBaseUrl}/api/dashboard/TTWO` +
    `?includeGtaEvents=${includeGtaEvents}` +
    `&limit=${limit}`

  return fetchJson<DashboardData>(
    endpoint,
    { signal },
    'Não foi possível carregar o dashboard.',
  )
}