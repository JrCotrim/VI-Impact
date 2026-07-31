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


export interface GtaEventImpact {
  eventId: string
  eventTitle: string
  symbol: string
  occurredAtUtc: string
  analysisTimestampUtc: string
  usedPublishedAtUtc: boolean
  isAvailable: boolean
  unavailableReason: string | null
  exchange: string
  exchangeTimezone: string
  wasPublishedAfterMarketClose: boolean | null
  effectiveTradingDate: string | null
  previousTradingDate: string | null
  previousClose: number | null
  eventDayOpen: number | null
  eventDayClose: number | null
  eventDayVolume: number | null
  sameDayReturnPercent: number | null
  day1TradingDate: string | null
  day1Close: number | null
  day1ReturnPercent: number | null
  day5TradingDate: string | null
  day5Close: number | null
  day5ReturnPercent: number | null
  day30TradingDate: string | null
  day30Close: number | null
  day30ReturnPercent: number | null
  averageVolumeBefore30Sessions: number | null
  previousVolumeSessionsUsed: number
  volumeChangePercent: number | null
  benchmarkSymbol: string
  benchmarkIsAvailable: boolean
  benchmarkUnavailableReason: string | null
  benchmarkExchange: string
  benchmarkExchangeTimezone: string
  benchmarkPreviousClose: number | null
  benchmarkEventDayClose: number | null
  benchmarkSameDayReturnPercent: number | null
  benchmarkDay1Close: number | null
  benchmarkDay1ReturnPercent: number | null
  benchmarkDay5Close: number | null
  benchmarkDay5ReturnPercent: number | null
  benchmarkDay30Close: number | null
  benchmarkDay30ReturnPercent: number | null
  sameDayExcessReturnPercent: number | null
  day1ExcessReturnPercent: number | null
  day5ExcessReturnPercent: number | null
  day30ExcessReturnPercent: number | null
  priceBefore: number | null
  priceBeforeRecordedAtUtc: string | null
  priceAfter: number | null
  priceAfterRecordedAtUtc: string | null
  priceChange: number | null
  priceChangePercent: number | null
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