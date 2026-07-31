import {
  useEffect,
  useRef,
  useState,
} from 'react'
import './App.css'
import { ChartPeriodSelector } from './components/ChartPeriodSelector'
import { StockChart } from './components/StockChart'
import { getDashboardData } from './services/dashboardService'
import { getGtaEventImpact } from './services/gtaEventImpactService'
import { getStockTimeSeries } from './services/stockTimeSeriesService'
import {
  formatGtaEventDate,
  getGtaEventCategoryLabel,
  getGtaEventConfirmationLabel,
  getGtaEventPresentation,
  getGtaEventPriorityLabel,
  getGtaEventSourceLabel,
  isOccurredGtaEvent,
  parseGtaEventDate,
} from './utils/gtaEventPresentation'
import type {
  DashboardData,
  GtaEvent,
  GtaEventImpact,
  StockPeriodPerformance,
  StockQuote,
  StockTimeSeries,
  StockTimeSeriesPeriod,
} from './types/dashboard'

type Theme = 'day' | 'night'

const performancePeriodOrder: StockTimeSeriesPeriod[] = [
  '1D',
  '7D',
  '1M',
  '3M',
  '6M',
  'YTD',
  '1Y',
  '2Y',
  '5Y',
  'MAX',
]

const longPerformancePeriods =
  new Set<StockTimeSeriesPeriod>([
    '1D',
    '7D',
    '1M',
    '3M',
    '6M',
    'YTD',
    '1Y',
    '2Y',
    '5Y',
  ])

const initialCustomRange =
  createInitialCustomRange()

function getReliablePerformancePeriods(
  requestedPeriod: StockTimeSeriesPeriod,
): Set<StockTimeSeriesPeriod> {
  if (requestedPeriod === '1D') {
    return new Set<StockTimeSeriesPeriod>([
      '1D',
    ])
  }

  if (requestedPeriod === '7D') {
    return new Set<StockTimeSeriesPeriod>([
      '7D',
    ])
  }

  if (requestedPeriod === 'MAX') {
    return new Set<StockTimeSeriesPeriod>([
      'MAX',
    ])
  }

  if (requestedPeriod === 'CUSTOM') {
    return new Set<StockTimeSeriesPeriod>()
  }

  return longPerformancePeriods
}

function mergePeriodPerformances(
  currentPerformances: StockPeriodPerformance[],
  incomingPerformances: StockPeriodPerformance[],
  requestedPeriod: StockTimeSeriesPeriod,
): StockPeriodPerformance[] {
  const reliablePeriods =
    getReliablePerformancePeriods(
      requestedPeriod,
    )

  const performancesByPeriod = new Map(
    currentPerformances.map(
      (performance) => [
        performance.period,
        performance.changePercent,
      ],
    ),
  )

  incomingPerformances.forEach(
    (performance) => {
      if (
        reliablePeriods.has(
          performance.period,
        ) &&
        performance.changePercent !== null
      ) {
        performancesByPeriod.set(
          performance.period,
          performance.changePercent,
        )
      }
    },
  )

  return performancePeriodOrder.flatMap(
    (period) => {
      const changePercent =
        performancesByPeriod.get(period)

      if (changePercent === undefined) {
        return []
      }

      return [
        {
          period,
          changePercent,
        },
      ]
    },
  )
}

function getInitialTheme(): Theme {
  const savedTheme =
    localStorage.getItem('vi-impact-theme')

  return savedTheme === 'night'
    ? 'night'
    : 'day'
}

function parseUtcDate(dateText: string): Date {
  return parseGtaEventDate(dateText)
}

function formatTime(dateText: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(parseUtcDate(dateText))
}

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatSignedCurrency(
  value: number,
): string {
  const absoluteValue = formatCurrency(
    Math.abs(value),
  )

  if (value > 0) {
    return `+${absoluteValue}`
  }

  if (value < 0) {
    return `-${absoluteValue}`
  }

  return absoluteValue
}

function formatSignedPercent(
  value: number,
): string {
  const formattedValue = Math.abs(value)
    .toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  if (value > 0) {
    return `+${formattedValue}%`
  }

  if (value < 0) {
    return `-${formattedValue}%`
  }

  return `${formattedValue}%`
}


function calculateSeriesReturnPercent(
  timeSeries: StockTimeSeries | null,
): number | null {
  if (
    !timeSeries ||
    timeSeries.values.length < 2
  ) {
    return null
  }

  const sortedValues = [
    ...timeSeries.values,
  ].sort(
    (firstValue, secondValue) =>
      parseUtcDate(
        firstValue.dateTimeUtc,
      ).getTime() -
      parseUtcDate(
        secondValue.dateTimeUtc,
      ).getTime(),
  )

  const firstClose = sortedValues[0].close
  const lastClose =
    sortedValues[sortedValues.length - 1].close

  if (
    !Number.isFinite(firstClose) ||
    !Number.isFinite(lastClose) ||
    firstClose <= 0
  ) {
    return null
  }

  return (
    ((lastClose - firstClose) /
      firstClose) *
    100
  )
}

function formatCompactVolume(
  value: number,
): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}


function formatImpactCurrency(
  value: number | null,
): string {
  if (value === null) {
    return 'Ainda não disponível'
  }

  return formatCurrency(value)
}

function formatImpactPercent(
  value: number | null,
): string {
  if (value === null) {
    return 'Ainda não disponível'
  }

  return formatSignedPercent(value)
}

function formatBenchmarkPercent(
  value: number | null,
): string {
  return value === null
    ? '—'
    : formatSignedPercent(value)
}

function getImpactValueClassName(
  value: number | null,
): string {
  if (value === null || value === 0) {
    return 'impact-neutral'
  }

  return value > 0
    ? 'impact-positive'
    : 'impact-negative'
}

interface ImpactComparisonRow {
  label: string
  stockReturnPercent: number | null
  benchmarkReturnPercent: number | null
  excessReturnPercent: number | null
}

function getImpactComparisonRows(
  impact: GtaEventImpact,
): ImpactComparisonRow[] {
  return [
    {
      label: 'Mesmo pregão',
      stockReturnPercent:
        impact.sameDayReturnPercent,
      benchmarkReturnPercent:
        impact.benchmarkSameDayReturnPercent,
      excessReturnPercent:
        impact.sameDayExcessReturnPercent,
    },
    {
      label: 'Após 1 pregão',
      stockReturnPercent:
        impact.day1ReturnPercent,
      benchmarkReturnPercent:
        impact.benchmarkDay1ReturnPercent,
      excessReturnPercent:
        impact.day1ExcessReturnPercent,
    },
    {
      label: 'Após 5 pregões',
      stockReturnPercent:
        impact.day5ReturnPercent,
      benchmarkReturnPercent:
        impact.benchmarkDay5ReturnPercent,
      excessReturnPercent:
        impact.day5ExcessReturnPercent,
    },
    {
      label: 'Após 30 pregões',
      stockReturnPercent:
        impact.day30ReturnPercent,
      benchmarkReturnPercent:
        impact.benchmarkDay30ReturnPercent,
      excessReturnPercent:
        impact.day30ExcessReturnPercent,
    },
  ]
}

function formatTradingDate(
  dateText: string | null,
): string {
  if (!dateText) {
    return 'Ainda não disponível'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseUtcDate(dateText))
}

function getUtcDateKey(
  dateText: string,
): string {
  return parseUtcDate(dateText)
    .toISOString()
    .slice(0, 10)
}

function getTradingDateExplanation(
  gtaEvent: GtaEvent,
  impact: GtaEventImpact,
): string | null {
  if (!impact.effectiveTradingDate) {
    return null
  }

  if (impact.wasPublishedAfterMarketClose === true) {
    return (
      'A publicação ocorreu depois do fechamento do mercado. ' +
      `Por isso, o pregão analisado foi ${formatTradingDate(
        impact.effectiveTradingDate,
      )}.`
    )
  }

  const eventDateKey = getUtcDateKey(
    gtaEvent.occurredAtUtc,
  )

  const tradingDateKey = getUtcDateKey(
    impact.effectiveTradingDate,
  )

  if (eventDateKey === tradingDateKey) {
    return null
  }

  const eventDay = parseUtcDate(
    gtaEvent.occurredAtUtc,
  ).getUTCDay()

  const eventTimingDescription =
    eventDay === 0
      ? 'um domingo'
      : eventDay === 6
        ? 'um sábado'
        : 'um dia sem pregão'

  return (
    `O evento ocorreu em ${eventTimingDescription}. ` +
    `Por isso, o primeiro pregão analisado foi ${formatTradingDate(
      impact.effectiveTradingDate,
    )}.`
  )
}

function toDateInputValue(
  date: Date,
): string {
  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60 *
        1000,
  )

  return localDate
    .toISOString()
    .slice(0, 10)
}

function createInitialCustomRange() {
  const endDate = new Date()
  const startDate = new Date(endDate)

  startDate.setMonth(
    startDate.getMonth() - 1,
  )

  return {
    startDate:
      toDateInputValue(startDate),
    endDate:
      toDateInputValue(endDate),
  }
}


function createEventFocusRange(
  eventDateText: string,
) {
  const eventDate = parseUtcDate(
    eventDateText,
  )

  const startDate = new Date(eventDate)
  const endDate = new Date(eventDate)

  startDate.setUTCDate(
    startDate.getUTCDate() - 14,
  )

  endDate.setUTCDate(
    endDate.getUTCDate() + 14,
  )

  const startDateValue = startDate
    .toISOString()
    .slice(0, 10)

  const proposedEndDateValue = endDate
    .toISOString()
    .slice(0, 10)

  const todayValue =
    toDateInputValue(new Date())

  return {
    startDate: startDateValue,
    endDate:
      proposedEndDateValue > todayValue
        ? todayValue
        : proposedEndDateValue,
  }
}

function getSortedQuotes(
  quotes: StockQuote[],
): StockQuote[] {
  return [...quotes].sort(
    (firstQuote, secondQuote) =>
      parseUtcDate(
        firstQuote.recordedAtUtc,
      ).getTime() -
      parseUtcDate(
        secondQuote.recordedAtUtc,
      ).getTime(),
  )
}

function getLatestQuote(
  quotes: StockQuote[],
): StockQuote {
  return getSortedQuotes(quotes).at(-1) ??
    quotes[0]
}

function calculateAbsoluteChange(
  price: number,
  changePercent: number,
): number {
  const divisor = 1 + changePercent / 100

  if (divisor === 0) {
    return 0
  }

  const previousClose = price / divisor

  return price - previousClose
}

function createSparklinePoints(
  quotes: StockQuote[],
): string {
  const recentQuotes = getSortedQuotes(quotes)
    .slice(-28)

  if (recentQuotes.length === 0) {
    return '0,26 180,26'
  }

  const prices = recentQuotes.map(
    (quote) => quote.price,
  )

  const minimumPrice = Math.min(...prices)
  const maximumPrice = Math.max(...prices)
  const priceRange =
    maximumPrice - minimumPrice || 1

  return prices
    .map((price, index) => {
      const x =
        prices.length === 1
          ? 90
          : (index /
              (prices.length - 1)) *
            180

      const y =
        48 -
        ((price - minimumPrice) /
          priceRange) *
          40

      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function createVolumeBars(
  quotes: StockQuote[],
): number[] {
  const volumes = getSortedQuotes(quotes)
    .slice(-13)
    .map((quote) => quote.volume)

  if (volumes.length === 0) {
    return [20, 34, 26, 42, 30, 48, 36]
  }

  const maximumVolume =
    Math.max(...volumes) || 1

  return volumes.map(
    (volume) =>
      Math.max(
        10,
        Math.round(
          (volume / maximumVolume) * 48,
        ),
      ),
  )
}

function formatUpdatedAgo(
  dateText: string,
  referenceTimestamp: number,
): string {
  const elapsedSeconds = Math.max(
    0,
    Math.floor(
      (referenceTimestamp -
        parseUtcDate(dateText).getTime()) /
        1000,
    ),
  )

  if (elapsedSeconds < 5) {
    return 'Atualizado agora'
  }

  if (elapsedSeconds < 60) {
    return `Atualizado há ${elapsedSeconds} segundos`
  }

  const elapsedMinutes =
    Math.floor(elapsedSeconds / 60)

  if (elapsedMinutes < 60) {
    return `Atualizado há ${elapsedMinutes} min`
  }

  const elapsedHours =
    Math.floor(elapsedMinutes / 60)

  if (elapsedHours < 24) {
    return `Atualizado há ${elapsedHours} h`
  }

  const elapsedDays =
    Math.floor(elapsedHours / 24)

  return `Atualizado há ${elapsedDays} ${
    elapsedDays === 1 ? 'dia' : 'dias'
  }`
}

function getDateKeyInTimeZone(
  date: Date,
  timeZone: string,
): string {
  const dateParts =
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).formatToParts(date)

  const valuesByType = new Map(
    dateParts.map((part) => [
      part.type,
      part.value,
    ]),
  )

  return [
    valuesByType.get('year'),
    valuesByType.get('month'),
    valuesByType.get('day'),
  ].join('-')
}

function getMarketStatus(
  quote: StockQuote,
  referenceTimestamp: number,
  exchangeTimezone: string,
): 'Mercado aberto' | 'Mercado fechado' {
  const referenceDate =
    new Date(referenceTimestamp)

  const marketParts =
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: exchangeTimezone,
    }).formatToParts(referenceDate)

  const valuesByType = new Map(
    marketParts.map((part) => [
      part.type,
      part.value,
    ]),
  )

  const weekday = valuesByType.get('weekday')
  const hour = Number(valuesByType.get('hour'))
  const minute = Number(valuesByType.get('minute'))
  const minutesSinceMidnight =
    hour * 60 + minute

  const isWeekday =
    weekday !== 'Sat' &&
    weekday !== 'Sun'

  const isRegularSession =
    minutesSinceMidnight >= 9 * 60 + 30 &&
    minutesSinceMidnight < 16 * 60

  const marketTimestamp =
    quote.marketTimestampUtc ??
    quote.recordedAtUtc

  const quoteAgeInMinutes =
    (referenceTimestamp -
      parseUtcDate(marketTimestamp).getTime()) /
    60_000

  const hasFreshMarketData =
    quoteAgeInMinutes >= -5 &&
    quoteAgeInMinutes <= 20

  return isWeekday &&
    isRegularSession &&
    hasFreshMarketData
    ? 'Mercado aberto'
    : 'Mercado fechado'
}

function calculateAverageVolumeForPreviousSessions(
  timeSeries: StockTimeSeries,
  latestQuote: StockQuote,
): number | null {
  if (
    timeSeries.interval.toLowerCase() !==
    '1day'
  ) {
    return null
  }

  const exchangeTimezone =
    timeSeries.exchangeTimezone ||
    'America/New_York'

  const quoteTimestamp =
    latestQuote.marketTimestampUtc ??
    latestQuote.recordedAtUtc

  const latestMarketDateKey =
    getDateKeyInTimeZone(
      parseUtcDate(quoteTimestamp),
      exchangeTimezone,
    )

  const previousSessions = [
    ...timeSeries.values,
  ]
    .filter(
      (value) =>
        value.volume > 0 &&
        value.dateTimeUtc.slice(0, 10) <
          latestMarketDateKey,
    )
    .sort(
      (firstValue, secondValue) =>
        parseUtcDate(
          firstValue.dateTimeUtc,
        ).getTime() -
        parseUtcDate(
          secondValue.dateTimeUtc,
        ).getTime(),
    )
    .slice(-30)

  if (previousSessions.length < 30) {
    return null
  }

  return (
    previousSessions.reduce(
      (totalVolume, value) =>
        totalVolume + value.volume,
      0,
    ) / previousSessions.length
  )
}

function formatVolumeComparison(
  changePercent: number | null,
): string {
  if (changePercent === null) {
    return 'Calculando média de 30 dias'
  }

  if (Math.abs(changePercent) < 0.01) {
    return 'Na média dos últimos 30 dias'
  }

  const formattedPercent =
    Math.abs(changePercent).toLocaleString(
      'pt-BR',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )

  return changePercent > 0
    ? `+${formattedPercent}% acima da média de 30 dias`
    : `-${formattedPercent}% abaixo da média de 30 dias`
}

function getVolumeComparisonClassName(
  changePercent: number | null,
): string {
  if (
    changePercent === null ||
    Math.abs(changePercent) < 0.01
  ) {
    return 'summary-card-context'
  }

  return changePercent > 0
    ? 'summary-card-context volume-comparison-positive'
    : 'summary-card-context volume-comparison-negative'
}

function App() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [timeSeries, setTimeSeries] =
    useState<StockTimeSeries | null>(null)

  const [
    benchmarkTimeSeries,
    setBenchmarkTimeSeries,
  ] = useState<StockTimeSeries | null>(null)

  const [
    benchmarkError,
    setBenchmarkError,
  ] = useState<string | null>(null)

  const [
    periodPerformances,
    setPeriodPerformances,
  ] = useState<StockPeriodPerformance[]>([])

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] = useState<StockTimeSeriesPeriod>('1Y')

  const [
    customStartDate,
    setCustomStartDate,
  ] = useState(
    initialCustomRange.startDate,
  )

  const [
    customEndDate,
    setCustomEndDate,
  ] = useState(
    initialCustomRange.endDate,
  )

  const [
    appliedCustomStartDate,
    setAppliedCustomStartDate,
  ] = useState(
    initialCustomRange.startDate,
  )

  const [
    appliedCustomEndDate,
    setAppliedCustomEndDate,
  ] = useState(
    initialCustomRange.endDate,
  )

  const [
    isDashboardLoading,
    setIsDashboardLoading,
  ] = useState(true)

  const [
    isChartLoading,
    setIsChartLoading,
  ] = useState(true)

  const [
    dashboardError,
    setDashboardError,
  ] = useState<string | null>(null)

  const [
    chartError,
    setChartError,
  ] = useState<string | null>(null)

  const [theme, setTheme] =
    useState<Theme>(getInitialTheme)

  const [
    currentTimestamp,
    setCurrentTimestamp,
  ] = useState(() => Date.now())

  const [
    averageVolume30Sessions,
    setAverageVolume30Sessions,
  ] = useState<number | null>(null)


  const [
    selectedEventId,
    setSelectedEventId,
  ] = useState<string | null>(null)

  const [
    expandedEventId,
    setExpandedEventId,
  ] = useState<string | null>(null)

  const [
    eventImpacts,
    setEventImpacts,
  ] = useState<Record<string, GtaEventImpact>>({})

  const [
    loadingEventImpactIds,
    setLoadingEventImpactIds,
  ] = useState<Set<string>>(new Set())

  const [
    eventImpactErrors,
    setEventImpactErrors,
  ] = useState<Record<string, string>>({})

  const eventImpactRequestsRef =
    useRef<Set<string>>(new Set())

  const eventsListRef =
    useRef<HTMLDivElement | null>(null)

  const [
    timelineScrollRequest,
    setTimelineScrollRequest,
  ] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme

    localStorage.setItem(
      'vi-impact-theme',
      theme,
    )
  }, [theme])

  useEffect(() => {
    const intervalId = window.setInterval(
      () => {
        setCurrentTimestamp(Date.now())
      },
      1000,
    )

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (
      !dashboard ||
      dashboard.quotes.length === 0 ||
      !timeSeries
    ) {
      return
    }

    const averageVolume =
      calculateAverageVolumeForPreviousSessions(
        timeSeries,
        getLatestQuote(dashboard.quotes),
      )

    if (averageVolume !== null) {
      setAverageVolume30Sessions(
        averageVolume,
      )
    }
  }, [dashboard, timeSeries])

  useEffect(() => {
    if (!expandedEventId) {
      return
    }

    const animationFrameId =
      window.requestAnimationFrame(() => {
        const eventsList =
          eventsListRef.current

        const expandedEventCard =
          document.getElementById(
            `event-card-${expandedEventId}`,
          )

        if (
          !eventsList ||
          !expandedEventCard
        ) {
          return
        }

        const eventsListRect =
          eventsList.getBoundingClientRect()

        const eventCardRect =
          expandedEventCard.getBoundingClientRect()

        const centeredScrollTop =
          eventsList.scrollTop +
          eventCardRect.top -
          eventsListRect.top -
          (eventsList.clientHeight -
            eventCardRect.height) /
            2

        eventsList.scrollTo({
          top: Math.max(0, centeredScrollTop),
          behavior: 'smooth',
        })
      })

    return () => {
      window.cancelAnimationFrame(
        animationFrameId,
      )
    }
  }, [
    expandedEventId,
    timelineScrollRequest,
  ])

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      try {
        const dashboardData =
          await getDashboardData(
            true,
            100,
          )

        if (isActive) {
          setDashboard(dashboardData)
        }
      } catch (error) {
        if (isActive) {
          setDashboardError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar o dashboard.',
          )
        }
      } finally {
        if (isActive) {
          setIsDashboardLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const timeoutId =
      window.setTimeout(() => {
        async function loadTimeSeries() {
          const requestOptions = {
            period: selectedPeriod,

            startDate:
              selectedPeriod === 'CUSTOM'
                ? appliedCustomStartDate
                : undefined,

            endDate:
              selectedPeriod === 'CUSTOM'
                ? appliedCustomEndDate
                : undefined,
          }

          const [
            primaryResult,
            benchmarkResult,
          ] = await Promise.allSettled([
            getStockTimeSeries(
              'TTWO',
              requestOptions,
            ),
            getStockTimeSeries(
              'QQQ',
              requestOptions,
            ),
          ])

          if (!isActive) {
            return
          }

          if (
            primaryResult.status ===
            'rejected'
          ) {
            setChartError(
              primaryResult.reason instanceof Error
                ? primaryResult.reason.message
                : 'Não foi possível carregar o histórico.',
            )
            setTimeSeries(null)
            setBenchmarkTimeSeries(null)
            setBenchmarkError(null)
            setIsChartLoading(false)
            return
          }

          const timeSeriesData =
            primaryResult.value

          setPeriodPerformances(
            (currentPerformances) =>
              mergePeriodPerformances(
                currentPerformances,
                timeSeriesData.performances,
                selectedPeriod,
              ),
          )

          setTimeSeries(timeSeriesData)
          setChartError(null)

          if (
            benchmarkResult.status ===
            'fulfilled'
          ) {
            setBenchmarkTimeSeries(
              benchmarkResult.value,
            )
            setBenchmarkError(null)
          } else {
            setBenchmarkTimeSeries(null)
            setBenchmarkError(
              benchmarkResult.reason instanceof Error
                ? benchmarkResult.reason.message
                : 'O histórico do QQQ não está disponível.',
            )
          }

          setIsChartLoading(false)
        }

        void loadTimeSeries()
      }, 250)

    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [
    selectedPeriod,
    appliedCustomStartDate,
    appliedCustomEndDate,
  ])

  function prepareChartReload() {
    setIsChartLoading(true)
    setChartError(null)
    setBenchmarkError(null)
    setTimeSeries(null)
    setBenchmarkTimeSeries(null)
  }

  function handlePeriodChange(
    period: StockTimeSeriesPeriod,
  ) {
    if (period === selectedPeriod) {
      return
    }

    setSelectedEventId(null)
    setExpandedEventId(null)
    prepareChartReload()
    setSelectedPeriod(period)
  }

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'day'
        ? 'night'
        : 'day',
    )
  }

  function handleCustomDateChange(
    field: 'start' | 'end',
    value: string,
  ) {
    if (field === 'start') {
      setCustomStartDate(value)
      return
    }

    setCustomEndDate(value)
  }

  function handleApplyCustomPeriod() {
    const isSameCustomPeriod =
      selectedPeriod === 'CUSTOM' &&
      customStartDate ===
        appliedCustomStartDate &&
      customEndDate ===
        appliedCustomEndDate

    if (isSameCustomPeriod) {
      return
    }

    setSelectedEventId(null)
    setExpandedEventId(null)
    prepareChartReload()

    setAppliedCustomStartDate(
      customStartDate,
    )

    setAppliedCustomEndDate(
      customEndDate,
    )

    setSelectedPeriod('CUSTOM')
  }

  function focusEventOnChart(
    gtaEvent: GtaEvent,
  ) {
    const focusRange =
      createEventFocusRange(
        gtaEvent.occurredAtUtc,
      )

    const requiresReload =
      selectedPeriod !== 'CUSTOM' ||
      focusRange.startDate !==
        appliedCustomStartDate ||
      focusRange.endDate !==
        appliedCustomEndDate

    setSelectedEventId(gtaEvent.id)
    setCustomStartDate(
      focusRange.startDate,
    )
    setCustomEndDate(
      focusRange.endDate,
    )
    setAppliedCustomStartDate(
      focusRange.startDate,
    )
    setAppliedCustomEndDate(
      focusRange.endDate,
    )

    if (requiresReload) {
      prepareChartReload()
      setSelectedPeriod('CUSTOM')
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById('chart')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
    })
  }

  async function loadEventImpact(
    gtaEvent: GtaEvent,
  ) {
    if (
      gtaEvent.isImpactAnalysisEligible === false ||
      eventImpacts[gtaEvent.id] ||
      eventImpactRequestsRef.current.has(
        gtaEvent.id,
      )
    ) {
      return
    }

    eventImpactRequestsRef.current.add(
      gtaEvent.id,
    )

    setLoadingEventImpactIds(
      (currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.add(gtaEvent.id)
        return nextIds
      },
    )

    setEventImpactErrors(
      (currentErrors) => {
        const nextErrors = {
          ...currentErrors,
        }

        delete nextErrors[gtaEvent.id]
        return nextErrors
      },
    )

    try {
      const impact =
        await getGtaEventImpact(
          gtaEvent.id,
          dashboard?.symbol ?? 'TTWO',
          'QQQ',
        )

      setEventImpacts(
        (currentImpacts) => ({
          ...currentImpacts,
          [gtaEvent.id]: impact,
        }),
      )
    } catch (error) {
      setEventImpactErrors(
        (currentErrors) => ({
          ...currentErrors,
          [gtaEvent.id]:
            error instanceof Error
              ? error.message
              : 'Não foi possível calcular o movimento observado.',
        }),
      )
    } finally {
      eventImpactRequestsRef.current.delete(
        gtaEvent.id,
      )

      setLoadingEventImpactIds(
        (currentIds) => {
          const nextIds = new Set(currentIds)
          nextIds.delete(gtaEvent.id)
          return nextIds
        },
      )
    }
  }

  function handleChartEventSelect(
    gtaEvent: GtaEvent,
  ) {
    setExpandedEventId(gtaEvent.id)
    setTimelineScrollRequest(
      (currentRequest) =>
        currentRequest + 1,
    )
    void loadEventImpact(gtaEvent)
    focusEventOnChart(gtaEvent)
  }

  function handleTimelineEventSelect(
    gtaEvent: GtaEvent,
  ) {
    const willExpand =
      expandedEventId !== gtaEvent.id

    setExpandedEventId(
      willExpand
        ? gtaEvent.id
        : null,
    )

    if (willExpand) {
      void loadEventImpact(gtaEvent)
    }

    focusEventOnChart(gtaEvent)
  }

  if (
    isDashboardLoading &&
    !dashboard
  ) {
    return (
      <main className="status-screen">
        <div className="status-card">
          <span className="status-pulse" />
          <p>
            Carregando dados do VI Impact...
          </p>
        </div>
      </main>
    )
  }

  if (dashboardError) {
    return (
      <main className="status-screen">
        <div className="status-card error">
          <p>Erro: {dashboardError}</p>
        </div>
      </main>
    )
  }

  if (
    !dashboard ||
    dashboard.quotes.length === 0
  ) {
    return (
      <main className="status-screen">
        <div className="status-card">
          <p>
            Nenhuma cotação disponível.
          </p>
        </div>
      </main>
    )
  }

  const latestQuote =
    getLatestQuote(dashboard.quotes)

  const isPositive =
    latestQuote.changePercent >= 0

  const absoluteChange =
    calculateAbsoluteChange(
      latestQuote.price,
      latestQuote.changePercent,
    )

  const sparklinePoints =
    createSparklinePoints(
      dashboard.quotes,
    )

  const volumeBars =
    createVolumeBars(
      dashboard.quotes,
    )

  const exchangeName =
    timeSeries?.exchange ?? 'NASDAQ'

  const exchangeTimezone =
    timeSeries?.exchangeTimezone ||
    'America/New_York'

  const marketStatus =
    getMarketStatus(
      latestQuote,
      currentTimestamp,
      exchangeTimezone,
    )

  const volumeChangePercent =
    averageVolume30Sessions &&
    averageVolume30Sessions > 0
      ? ((latestQuote.volume -
          averageVolume30Sessions) /
          averageVolume30Sessions) *
        100
      : null

  const primaryPeriodReturn =
    calculateSeriesReturnPercent(timeSeries)
  const benchmarkPeriodReturn =
    calculateSeriesReturnPercent(
      benchmarkTimeSeries,
    )
  const hasBenchmarkComparison =
    benchmarkTimeSeries !== null &&
    benchmarkTimeSeries.values.length > 0

  const occurredEvents =
    [...dashboard.gtaEvents]
      .filter((gtaEvent) =>
        isOccurredGtaEvent(gtaEvent),
      )
      .sort(
        (firstEvent, secondEvent) =>
          parseUtcDate(
            secondEvent.occurredAtUtc,
          ).getTime() -
          parseUtcDate(
            firstEvent.occurredAtUtc,
          ).getTime(),
      )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand-link"
          href="#dashboard"
          aria-label="Ir para o dashboard"
        >
          <img
            className="brand-logo"
            src="/vi-impact-logo.png"
            alt="VI Impact"
          />
        </a>

        <div className="topbar-actions">
          <button
            className={`theme-toggle ${theme}`}
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'night'
                ? 'Ativar tema Dia'
                : 'Ativar tema Noite'
            }
            aria-pressed={
              theme === 'night'
            }
          >
            <span
              className="theme-toggle-status-icon"
              aria-hidden="true"
            >
              {theme === 'night' ? (
                <svg viewBox="0 0 24 24">
                  <path d="M20.4 15.5A8.4 8.4 0 0 1 8.5 3.6a8.5 8.5 0 1 0 11.9 11.9Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                </svg>
              )}
            </span>

            <span className="theme-toggle-copy">
              <span className="theme-toggle-title">
                {theme === 'night'
                  ? 'Noite'
                  : 'Dia'}
              </span>
              <span className="theme-toggle-subtitle">
                Tema
              </span>
            </span>

            <span
              className="theme-toggle-track"
              aria-hidden="true"
            >
              <span className="theme-toggle-thumb" />
            </span>
          </button>
        </div>
      </header>

      <main
        className="dashboard"
        id="dashboard"
      >
        <section className="hero-banner">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              VI Impact · Mercado e entretenimento
            </p>

            <h1>
              Take-Two Interactive ({dashboard.symbol})
            </h1>

            <p>
              Impacto de notícias do GTA 6 no mercado
            </p>
          </div>

          <div
            className="hero-art"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 760 220"
              preserveAspectRatio="xMidYMax meet"
            >
              <g className="hero-sun">
                <circle
                  cx="562"
                  cy="96"
                  r="54"
                />
              </g>

              <g className="hero-buildings">
                <path d="M5 220V176h34v-29h24v73h18v-93h31v93h18v-58h28v58h22v-112h34v112h22v-74h30v74h17v-126h38v126h18v-92h28v92h23v-147h41v147h23v-83h25v83h24v-113h34v113h21v-64h27v64h24v-135h39v135h22v-101h30v101h20v-72h28v72h30v-119h36v119h27v-83h31v83Z" />
              </g>

              <g className="hero-palms">
                <path d="M568 220c-2-51-2-87 4-128l8 1c-4 43-3 83 1 127Zm7-132c-23-17-39-18-55-7 18-2 31 4 43 17-19-4-34 1-44 14 18-8 34-6 48 4-7-20-4-35 8-49-3 10-2 20 4 29 4-19 15-31 33-38-11 11-17 23-18 36 13-13 29-17 48-11-16 3-29 11-39 25 17-7 32-4 45 8-21-5-38-2-52 10-7-16-14-29-21-38Z" />
                <path d="M690 220c1-39 0-70-4-103l7-1c6 34 8 69 8 104Zm-2-107c-18-13-31-14-44-6 15-1 25 4 34 14-15-3-27 1-35 11 15-6 27-5 39 3-5-16-3-28 7-39-2 8-1 16 3 23 4-15 13-25 27-30-9 9-14 18-15 29 11-10 24-13 39-8-13 2-23 9-31 19 14-5 26-3 36 7-17-4-30-2-41 8-5-13-11-23-17-31Z" />
              </g>
            </svg>
          </div>
        </section>

        <section
          className="summary-grid"
          aria-label="Resumo da cotação"
        >
          <article className="summary-card price-card">
            <div className="summary-card-heading">
              <span className="summary-icon price-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2v20M16.5 6.5H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H7.5" />
                </svg>
              </span>

              <div className="summary-card-heading-copy">
                <span className="summary-card-title">
                  Preço atual
                </span>
                <span className="summary-card-symbol">
                  {dashboard.symbol} · {exchangeName}
                </span>
              </div>
            </div>

            <div className="summary-card-main summary-card-main-stacked">
              <strong>
                {formatCurrency(
                  latestQuote.price,
                )}
              </strong>

              <span className="summary-card-context">
                Último preço registrado
              </span>
            </div>

            <small>
              <span
                className={`live-dot ${
                  marketStatus === 'Mercado aberto'
                    ? ''
                    : 'market-closed'
                }`}
              />
              {marketStatus}
            </small>
          </article>

          <article className="summary-card variation-card">
            <div className="summary-card-heading">
              <span className="summary-icon variation-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m5 16 5-5 3 3 6-7" />
                  <path d="M14 7h5v5" />
                </svg>
              </span>

              <span className="summary-card-title">
                Variação diária
              </span>
            </div>

            <div className="variation-content">
              <div className="variation-values">
                <strong
                  className={
                    isPositive
                      ? 'positive-value'
                      : 'negative-value'
                  }
                >
                  {formatSignedCurrency(
                    absoluteChange,
                  )}
                </strong>

                <span
                  className={
                    isPositive
                      ? 'variation-percent positive-value'
                      : 'variation-percent negative-value'
                  }
                >
                  {formatSignedPercent(
                    latestQuote.changePercent,
                  )}
                  <span className="variation-period-copy">
                    desde o fechamento anterior
                  </span>
                </span>
              </div>

              <svg
                className={
                  isPositive
                    ? 'summary-sparkline positive'
                    : 'summary-sparkline negative'
                }
                viewBox="0 0 180 56"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  points={sparklinePoints}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <small>
              <span className="live-dot" />
              Últimos registros
            </small>
          </article>

          <article className="summary-card volume-card">
            <div className="summary-card-heading">
              <span className="summary-icon volume-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M5 20V11M12 20V5M19 20V8" />
                </svg>
              </span>

              <span className="summary-card-title">
                Volume negociado
              </span>
            </div>

            <div className="summary-card-main summary-card-main-stacked">
              <strong>
                {formatCompactVolume(
                  latestQuote.volume,
                )}
              </strong>

              <span
                className={getVolumeComparisonClassName(
                  volumeChangePercent,
                )}
              >
                {formatVolumeComparison(
                  volumeChangePercent,
                )}
              </span>
            </div>

            <div
              className="volume-bars"
              aria-hidden="true"
            >
              {volumeBars.map(
                (height, index) => (
                  <span
                    key={`${height}-${index}`}
                    style={{
                      height: `${height}px`,
                    }}
                  />
                ),
              )}
            </div>

            <small>
              <span className="live-dot" />
              Volume acumulado do pregão
            </small>
          </article>

          <article className="summary-card update-card">
            <div className="summary-card-heading">
              <span className="summary-icon update-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>

              <span className="summary-card-title">
                Última atualização
              </span>
            </div>

            <div className="summary-card-main summary-card-main-stacked">
              <strong className="time-value">
                {formatTime(
                  latestQuote.recordedAtUtc,
                )}
              </strong>

              <span className="summary-card-context update-age">
                {formatUpdatedAgo(
                  latestQuote.recordedAtUtc,
                  currentTimestamp,
                )}
              </span>
            </div>

            <small>
              <span className="live-dot" />
              Horário local
            </small>
          </article>
        </section>

        <section className="dashboard-content">
          <article
            className="chart-panel"
            id="chart"
          >
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  {hasBenchmarkComparison
                    ? `${timeSeries?.symbol ?? dashboard.symbol} × ${benchmarkTimeSeries?.symbol ?? 'QQQ'}`
                    : `${timeSeries?.symbol ?? dashboard.symbol} · ${timeSeries?.exchange ?? 'NASDAQ'}`}
                </p>

                <h2>
                  {hasBenchmarkComparison
                    ? 'Desempenho comparado (base 100)'
                    : 'Gráfico de cotações'}
                </h2>
              </div>

              {hasBenchmarkComparison && (
                <div
                  className="chart-comparison-legend"
                  aria-label="Legenda da comparação"
                >
                  <span className="chart-comparison-item">
                    <i className="chart-comparison-swatch primary" />
                    <span>
                      {timeSeries?.symbol ?? 'TTWO'}
                    </span>
                    <strong
                      className={getImpactValueClassName(
                        primaryPeriodReturn,
                      )}
                    >
                      {primaryPeriodReturn === null
                        ? '—'
                        : formatSignedPercent(
                            primaryPeriodReturn,
                          )}
                    </strong>
                  </span>

                  <span className="chart-comparison-item">
                    <i className="chart-comparison-swatch benchmark" />
                    <span>
                      {benchmarkTimeSeries?.symbol ?? 'QQQ'}
                    </span>
                    <strong
                      className={getImpactValueClassName(
                        benchmarkPeriodReturn,
                      )}
                    >
                      {benchmarkPeriodReturn === null
                        ? '—'
                        : formatSignedPercent(
                            benchmarkPeriodReturn,
                          )}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {benchmarkError && (
              <p className="chart-benchmark-status">
                QQQ indisponível no momento. O gráfico continua exibindo a TTWO.
              </p>
            )}

            <ChartPeriodSelector
              selectedPeriod={
                selectedPeriod
              }
              customStartDate={
                customStartDate
              }
              customEndDate={
                customEndDate
              }
              isLoading={
                isChartLoading
              }
              performances={
                periodPerformances
              }
              onPeriodChange={
                handlePeriodChange
              }
              onCustomDateChange={
                handleCustomDateChange
              }
              onApplyCustomPeriod={
                handleApplyCustomPeriod
              }
            />

            <div className="chart-content">
              {isChartLoading && (
                <div className="chart-state-message">
                  Carregando período...
                </div>
              )}

              {!isChartLoading &&
                chartError && (
                  <div className="chart-state-message error">
                    Erro: {chartError}
                  </div>
                )}

              {!isChartLoading &&
                !chartError &&
                timeSeries && (
                  <StockChart
                    values={
                      timeSeries.values
                    }
                    benchmarkValues={
                      benchmarkTimeSeries?.values ??
                      []
                    }
                    primarySymbol={
                      timeSeries.symbol ||
                      dashboard.symbol
                    }
                    benchmarkSymbol={
                      benchmarkTimeSeries?.symbol ??
                      'QQQ'
                    }
                    events={
                      occurredEvents
                    }
                    selectedEventId={
                      selectedEventId
                    }
                    onEventSelect={
                      handleChartEventSelect
                    }
                  />
                )}
            </div>

            <p className="chart-footnote">
              {hasBenchmarkComparison
                ? 'TTWO e QQQ normalizados em base 100 no início do período selecionado. Os eventos permanecem posicionados sobre a linha da TTWO.'
                : `Dados referentes ao período selecionado. Cotações em ${timeSeries?.currency ?? 'USD'}.`}
            </p>
          </article>

          <aside
            className="events-panel"
            id="events"
          >
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  Linha do tempo
                </p>

                <h2>
                  Eventos relacionados ao GTA 6
                </h2>
              </div>

              <span className="events-count">
                {occurredEvents.length}{' '}
                {occurredEvents.length === 1
                  ? 'evento'
                  : 'eventos'}
              </span>
            </div>

            <div
              className="events-list"
              ref={eventsListRef}
            >
              {occurredEvents.length > 0 ? (
                occurredEvents.map(
                  (gtaEvent) => {
                    const eventStyle =
                      getGtaEventPresentation(
                        gtaEvent,
                      )

                    const isSelected =
                      selectedEventId ===
                      gtaEvent.id

                    const isExpanded =
                      expandedEventId ===
                      gtaEvent.id

                    const categoryLabel =
                      getGtaEventCategoryLabel(
                        gtaEvent,
                      ) ?? 'Não classificada'

                    const priorityLabel =
                      getGtaEventPriorityLabel(
                        gtaEvent,
                      ) ?? 'Não classificada'

                    const confirmationLabel =
                      getGtaEventConfirmationLabel(
                        gtaEvent,
                      )

                    const sourceLabel =
                      getGtaEventSourceLabel(
                        gtaEvent,
                      )

                    const eventImpact =
                      eventImpacts[gtaEvent.id]

                    const isImpactLoading =
                      loadingEventImpactIds.has(
                        gtaEvent.id,
                      )

                    const eventImpactError =
                      eventImpactErrors[gtaEvent.id]

                    const tradingDateExplanation =
                      eventImpact
                        ? getTradingDateExplanation(
                            gtaEvent,
                            eventImpact,
                          )
                        : null

                    const impactComparisonRows =
                      eventImpact
                        ? getImpactComparisonRows(
                            eventImpact,
                          )
                        : []

                    const cardClassName = [
                      'event-card',
                      isSelected
                        ? 'selected'
                        : '',
                      isExpanded
                        ? 'expanded'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    const detailsId =
                      `event-details-${gtaEvent.id}`

                    return (
                      <article
                        id={`event-card-${gtaEvent.id}`}
                        className={cardClassName}
                        key={gtaEvent.id}
                      >
                        <button
                          className="event-focus-button"
                          type="button"
                          aria-pressed={isSelected}
                          aria-expanded={isExpanded}
                          aria-controls={detailsId}
                          onClick={() =>
                            handleTimelineEventSelect(
                              gtaEvent,
                            )
                          }
                        >
                          <div
                            className={`event-thumbnail ${eventStyle.className}`}
                            aria-hidden="true"
                          >
                            <span>
                              {eventStyle.symbol}
                            </span>
                          </div>

                          <div className="event-card-content">
                            <h3>
                              {gtaEvent.title}
                            </h3>

                            <p className="event-metadata">
                              {formatGtaEventDate(
                                gtaEvent.occurredAtUtc,
                              )}
                            </p>

                            <span
                              className={`event-badge ${eventStyle.className}`}
                            >
                              {eventStyle.label}
                            </span>
                          </div>

                          <span
                            className="event-expand-indicator"
                            aria-hidden="true"
                          >
                            ›
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            className="event-card-details"
                            id={detailsId}
                          >
                            <p className="event-detail-section-label">
                              Descrição
                            </p>

                            <p className="event-detail-description">
                              {gtaEvent.description}
                            </p>

                            <p className="event-detail-section-label event-detail-section-label-spaced">
                              Detalhes do evento
                            </p>

                            <div className="event-detail-grid">
                              <div>
                                <span>Categoria</span>
                                <strong>
                                  {categoryLabel}
                                </strong>
                              </div>

                              <div>
                                <span>Prioridade</span>
                                <strong>
                                  {priorityLabel}
                                </strong>
                              </div>

                              <div>
                                <span>Confirmação</span>
                                <strong>
                                  {confirmationLabel}
                                </strong>
                              </div>

                              <div>
                                <span>Fonte</span>
                                <strong>
                                  {sourceLabel}
                                </strong>
                              </div>

                              <div>
                                <span>Data do evento</span>
                                <strong>
                                  {formatTradingDate(
                                    gtaEvent.occurredAtUtc,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>Pregão analisado</span>
                                <strong>
                                  {gtaEvent.isImpactAnalysisEligible === false
                                    ? 'Não aplicável'
                                    : eventImpact
                                      ? formatTradingDate(
                                          eventImpact.effectiveTradingDate,
                                        )
                                      : isImpactLoading
                                        ? 'Calculando...'
                                        : 'Aguardando análise'}
                                </strong>
                              </div>
                            </div>

                            <section className="event-impact-section">
                              <div className="event-impact-heading">
                                <p className="event-detail-section-label">
                                  Movimento observado
                                </p>

                                {eventImpact?.exchange && (
                                  <span>
                                    {eventImpact.symbol} ·{' '}
                                    {eventImpact.exchange}
                                  </span>
                                )}
                              </div>

                              {gtaEvent.isImpactAnalysisEligible === false ? (
                                <p className="event-impact-status">
                                  Este evento não está elegível para análise de impacto.
                                </p>
                              ) : isImpactLoading ? (
                                <div className="event-impact-loading">
                                  <span className="event-impact-spinner" />
                                  <p>
                                    Calculando reação do mercado...
                                  </p>
                                </div>
                              ) : eventImpactError ? (
                                <div className="event-impact-error">
                                  <p>{eventImpactError}</p>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void loadEventImpact(
                                        gtaEvent,
                                      )
                                    }
                                  >
                                    Tentar novamente
                                  </button>
                                </div>
                              ) : eventImpact && !eventImpact.isAvailable ? (
                                <p className="event-impact-status">
                                  {eventImpact.unavailableReason ??
                                    'Não existem dados históricos suficientes para este evento.'}
                                </p>
                              ) : eventImpact ? (
                                <>
                                  <div className="event-impact-price-grid">
                                    <div>
                                      <span>Fechamento anterior</span>
                                      <strong>
                                        {formatImpactCurrency(
                                          eventImpact.previousClose,
                                        )}
                                      </strong>
                                    </div>

                                    <div>
                                      <span>Abertura no pregão</span>
                                      <strong>
                                        {formatImpactCurrency(
                                          eventImpact.eventDayOpen,
                                        )}
                                      </strong>
                                    </div>

                                    <div>
                                      <span>Fechamento no pregão</span>
                                      <strong>
                                        {formatImpactCurrency(
                                          eventImpact.eventDayClose,
                                        )}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="event-impact-metrics">
                                    <div>
                                      <span>
                                        Volume no pregão contra média anterior
                                      </span>
                                      <strong
                                        className={getImpactValueClassName(
                                          eventImpact.volumeChangePercent,
                                        )}
                                      >
                                        {formatImpactPercent(
                                          eventImpact.volumeChangePercent,
                                        )}
                                      </strong>
                                    </div>
                                  </div>

                                  <section className="event-benchmark-section">
                                    <div className="event-benchmark-heading">
                                      <div>
                                        <span className="event-benchmark-eyebrow">
                                          Comparação com benchmark
                                        </span>

                                        <strong>
                                          {eventImpact.symbol} ×{' '}
                                          {eventImpact.benchmarkSymbol ||
                                            'QQQ'}
                                        </strong>
                                      </div>

                                      <span>
                                        Retorno excedente ={' '}
                                        {eventImpact.symbol} −{' '}
                                        {eventImpact.benchmarkSymbol ||
                                          'QQQ'}
                                      </span>
                                    </div>

                                    {eventImpact.benchmarkIsAvailable ? (
                                      <div className="event-benchmark-table">
                                        <div className="event-benchmark-row event-benchmark-row-header">
                                          <span>Período</span>
                                          <span>
                                            {eventImpact.symbol}
                                          </span>
                                          <span>
                                            {eventImpact.benchmarkSymbol ||
                                              'QQQ'}
                                          </span>
                                          <span>Excedente</span>
                                        </div>

                                        {impactComparisonRows.map(
                                          (comparisonRow) => (
                                            <div
                                              className="event-benchmark-row"
                                              key={comparisonRow.label}
                                            >
                                              <span>
                                                {comparisonRow.label}
                                              </span>

                                              <strong
                                                className={getImpactValueClassName(
                                                  comparisonRow.stockReturnPercent,
                                                )}
                                              >
                                                {formatBenchmarkPercent(
                                                  comparisonRow.stockReturnPercent,
                                                )}
                                              </strong>

                                              <strong
                                                className={getImpactValueClassName(
                                                  comparisonRow.benchmarkReturnPercent,
                                                )}
                                              >
                                                {formatBenchmarkPercent(
                                                  comparisonRow.benchmarkReturnPercent,
                                                )}
                                              </strong>

                                              <strong
                                                className={getImpactValueClassName(
                                                  comparisonRow.excessReturnPercent,
                                                )}
                                              >
                                                {formatBenchmarkPercent(
                                                  comparisonRow.excessReturnPercent,
                                                )}
                                              </strong>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <p className="event-benchmark-status">
                                        {eventImpact.benchmarkUnavailableReason ??
                                          'Não existem dados suficientes do benchmark para este evento.'}
                                      </p>
                                    )}
                                  </section>

                                  {tradingDateExplanation && (
                                    <p className="event-impact-explanation">
                                      {tradingDateExplanation}
                                    </p>
                                  )}

                                  <p className="event-impact-disclaimer">
                                    O retorno excedente representa o movimento da {eventImpact.symbol} menos o movimento do {eventImpact.benchmarkSymbol || 'QQQ'} no mesmo intervalo. Os valores mostram movimentos observados e não comprovam que o evento foi a causa das variações.
                                  </p>
                                </>
                              ) : (
                                <p className="event-impact-status">
                                  Abra novamente o evento para carregar a análise.
                                </p>
                              )}
                            </section>

                            <div className="event-detail-footer">
                              {gtaEvent.sourceUrl.trim() ? (
                                <a
                                  className="event-detail-source-link"
                                  href={gtaEvent.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Ver fonte original
                                  <span aria-hidden="true">
                                    ↗
                                  </span>
                                </a>
                              ) : (
                                <span className="event-detail-source-missing">
                                  Cadastro pendente
                                </span>
                              )}

                              {gtaEvent.subcategory?.trim() && (
                                <span className="event-detail-subcategory">
                                  {gtaEvent.subcategory}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  },
                )
              ) : (
                <article className="empty-event-card">
                  <h3>
                    Nenhum evento cadastrado
                  </h3>

                  <p>
                    Ainda não existem eventos
                    relacionados ao GTA VI.
                  </p>
                </article>
              )}
            </div>

          </aside>
        </section>
      </main>
    </div>
  )
}

export default App