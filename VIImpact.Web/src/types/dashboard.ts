export interface StockQuote {
  price: number
  changePercent: number
  volume: number
  recordedAtUtc: string
  marketTimestampUtc: string | null
}

export interface GtaEvent {
  id: string
  title: string
  description: string
  sourceUrl: string
  occurredAtUtc: string
}

export interface DashboardData {
  symbol: string
  quotes: StockQuote[]
  gtaEvents: GtaEvent[]
}