export interface StockQuote {
  price: number
  changePercent: number
  volume: number
  recordedAtUtc: string
  marketTimestampUtc: string | null
}

export interface GtaEvent {
  id: string
  slug?: string
  title: string
  description: string
  category?: string | number
  subcategory?: string
  priority?: string | number
  sourceType?: string | number
  sourceName?: string
  sourceUrl: string
  occurredAtUtc: string
  occurredUntilUtc?: string | null
  publishedAtUtc?: string | null
  datePrecision?: string | number
  status?: string | number
  isOfficial?: boolean
  isImpactAnalysisEligible?: boolean
}

export interface DashboardData {
  symbol: string
  quotes: StockQuote[]
  gtaEvents: GtaEvent[]
}

export interface StockTimeSeriesPoint {
  dateTimeUtc: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockPeriodPerformance {
  period: StockTimeSeriesPeriod
  changePercent: number | null
}

export interface StockTimeSeries {
  symbol: string
  interval: string
  currency: string
  exchange: string
  exchangeTimezone: string
  values: StockTimeSeriesPoint[]
  performances: StockPeriodPerformance[]
}

export type StockTimeSeriesPeriod =
  | '1D'
  | '7D'
  | '1M'
  | '3M'
  | '6M'
  | 'YTD'
  | '1Y'
  | '2Y'
  | '5Y'
  | 'MAX'
  | 'CUSTOM'