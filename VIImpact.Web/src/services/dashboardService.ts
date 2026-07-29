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

  const response = await fetch(endpoint, { signal })

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar o dashboard. Status: ${response.status}`,
    )
  }

  return response.json() as Promise<DashboardData>
}