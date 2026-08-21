import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react'
import './App.css'
import { ChartPeriodSelector } from './components/ChartPeriodSelector'
import { EventIcon } from './components/EventIcon'
import { getDashboardData } from './services/dashboardService'
import {
  getGtaEventImpact,
  getGtaEventImpactRanking,
} from './services/gtaEventImpactService'
import { getStockTimeSeries } from './services/stockTimeSeriesService'
import {
  getRetryHint,
  toApiRequestError,
} from './services/apiClient'
import type { ApiRequestError } from './services/apiClient'
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

const StockChart = lazy(async () => {
  const stockChartModule = await import(
    './components/StockChart'
  )

  return {
    default: stockChartModule.StockChart,
  }
})

type Theme = 'day' | 'night'
type ImpactRankingPeriod =
  | '1D'
  | '5D'
  | '30D'

type ImpactRankingDirection =
  | 'ALL'
  | 'UP'
  | 'DOWN'

type ImpactRankingSort =
  | 'IMPACT_DESC'
  | 'IMPACT_ASC'
  | 'RECENT'
  | 'OLDEST'

type TimelineMode =
  | 'PERIOD'
  | 'ALL'

type InterfaceIconName =
  | 'external-link'
  | 'expand'
  | 'collapse'
  | 'search'
  | 'share'
  | 'copy'
  | 'chevron-right'

interface InterfaceIconProps {
  name: InterfaceIconName
  className?: string
}

function StockChartLoadingFallback() {
  return (
    <div className="chart-state-message">
      Carregando gráfico...
    </div>
  )
}

/**
 * Renders interface controls as SVGs so mobile browsers never substitute emojis.
 */
function InterfaceIcon({
  name,
  className,
}: InterfaceIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'external-link' && (
        <>
          <path
            d="M13 5h6v6M19 5l-8 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {name === 'expand' && (
        <path
          d="M7 17 17 7M10 7h7v7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {name === 'collapse' && (
        <path
          d="M6 12h12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {name === 'search' && (
        <>
          <circle
            cx="10.5"
            cy="10.5"
            r="5.5"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="m15 15 4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {name === 'share' && (
        <>
          <circle
            cx="18"
            cy="5"
            r="2.25"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle
            cx="6"
            cy="12"
            r="2.25"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle
            cx="18"
            cy="19"
            r="2.25"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m8 11 7.8-4.6M8 13l7.8 4.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}

      {name === 'copy' && (
        <>
          <rect
            x="8"
            y="8"
            width="10"
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}

      {name === 'chevron-right' && (
        <path
          d="m9 6 6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

const impactRankingPeriodOptions: Array<{
  value: ImpactRankingPeriod
  label: string
}> = [
  {
    value: '1D',
    label: '1 pregão',
  },
  {
    value: '5D',
    label: '5 pregões',
  },
  {
    value: '30D',
    label: '30 pregões',
  },
]


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

function formatSignedPercentagePoints(
  value: number,
): string {
  const formattedValue = Math.abs(value)
    .toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  if (value > 0) {
    return `+${formattedValue} p.p.`
  }

  if (value < 0) {
    return `-${formattedValue} p.p.`
  }

  return `${formattedValue} p.p.`
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

function getRankingImpactValue(
  impact: GtaEventImpact,
  period: ImpactRankingPeriod,
): number | null {
  if (period === '1D') {
    return impact.day1ReturnPercent
  }

  if (period === '5D') {
    return impact.day5ReturnPercent
  }

  return impact.day30ReturnPercent
}

function normalizeRankingSearchText(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function formatRankingOrderDate(
  dateText: string,
): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(parseUtcDate(dateText))
}

interface TimeZoneDateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function getTimeZoneDateParts(
  date: Date,
  timeZone: string,
): TimeZoneDateParts {
  const parts =
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }).formatToParts(date)

  const values = new Map(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  )

  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
  }
}

function createDateInTimeZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const expectedTimestamp = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
  )

  let resolvedTimestamp =
    expectedTimestamp

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const resolvedParts =
      getTimeZoneDateParts(
        new Date(resolvedTimestamp),
        timeZone,
      )

    const resolvedWallTimestamp =
      Date.UTC(
        resolvedParts.year,
        resolvedParts.month - 1,
        resolvedParts.day,
        resolvedParts.hour,
        resolvedParts.minute,
      )

    resolvedTimestamp +=
      expectedTimestamp -
      resolvedWallTimestamp
  }

  return new Date(resolvedTimestamp)
}

function getNextRegularSessionLabel(
  referenceTimestamp: number,
  timeZone: string,
): string {
  const referenceParts =
    getTimeZoneDateParts(
      new Date(referenceTimestamp),
      timeZone,
    )

  const minutesSinceMidnight =
    referenceParts.hour * 60 +
    referenceParts.minute

  const candidateDate = new Date(
    Date.UTC(
      referenceParts.year,
      referenceParts.month - 1,
      referenceParts.day,
    ),
  )

  const isWeekend =
    candidateDate.getUTCDay() === 0 ||
    candidateDate.getUTCDay() === 6

  if (
    isWeekend ||
    minutesSinceMidnight >=
      9 * 60 + 30
  ) {
    candidateDate.setUTCDate(
      candidateDate.getUTCDate() + 1,
    )
  }

  while (
    candidateDate.getUTCDay() === 0 ||
    candidateDate.getUTCDay() === 6
  ) {
    candidateDate.setUTCDate(
      candidateDate.getUTCDate() + 1,
    )
  }

  const nextSession =
    createDateInTimeZone(
      candidateDate.getUTCFullYear(),
      candidateDate.getUTCMonth() + 1,
      candidateDate.getUTCDate(),
      9,
      30,
      timeZone,
    )

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(nextSession)
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


interface TimelineEventGroup {
  dateKey: string
  label: string
  events: GtaEvent[]
}

function formatTimelineGroupDate(
  dateText: string,
): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(parseUtcDate(dateText))
    .toLocaleUpperCase('pt-BR')
}

function groupTimelineEvents(
  events: GtaEvent[],
): TimelineEventGroup[] {
  return events.reduce<TimelineEventGroup[]>(
    (groups, gtaEvent) => {
      const dateKey = getUtcDateKey(
        gtaEvent.occurredAtUtc,
      )

      const currentGroup =
        groups[groups.length - 1]

      if (
        !currentGroup ||
        currentGroup.dateKey !== dateKey
      ) {
        groups.push({
          dateKey,
          label: formatTimelineGroupDate(
            gtaEvent.occurredAtUtc,
          ),
          events: [gtaEvent],
        })

        return groups
      }

      currentGroup.events.push(gtaEvent)
      return groups
    },
    [],
  )
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

interface BenchmarkComparisonRow {
  key: '1D' | '5D' | '30D'
  label: string
  ttwoReturnPercent: number | null
  benchmarkReturnPercent: number | null
  excessReturnPercent: number | null
}

function getBenchmarkComparisonRows(
  impact: GtaEventImpact | undefined,
): BenchmarkComparisonRow[] {
  if (!impact?.isAvailable) {
    return []
  }

  return [
    {
      key: '1D',
      label: '1 pregão',
      ttwoReturnPercent: impact.day1ReturnPercent,
      benchmarkReturnPercent:
        impact.benchmarkDay1ReturnPercent,
      excessReturnPercent:
        impact.day1ExcessReturnPercent,
    },
    {
      key: '5D',
      label: '5 pregões',
      ttwoReturnPercent: impact.day5ReturnPercent,
      benchmarkReturnPercent:
        impact.benchmarkDay5ReturnPercent,
      excessReturnPercent:
        impact.day5ExcessReturnPercent,
    },
    {
      key: '30D',
      label: '30 pregões',
      ttwoReturnPercent: impact.day30ReturnPercent,
      benchmarkReturnPercent:
        impact.benchmarkDay30ReturnPercent,
      excessReturnPercent:
        impact.day30ExcessReturnPercent,
    },
  ]
}

function getBenchmarkRelativeReading(
  impact: GtaEventImpact | undefined,
  rows: BenchmarkComparisonRow[],
): string | null {
  if (
    !impact?.isAvailable ||
    !impact.benchmarkIsAvailable
  ) {
    return null
  }

  const preferredOrder: BenchmarkComparisonRow['key'][] = [
    '5D',
    '1D',
    '30D',
  ]

  const referenceRow = preferredOrder
    .map((key) =>
      rows.find((row) => row.key === key),
    )
    .find(
      (row) =>
        row !== undefined &&
        row.ttwoReturnPercent !== null &&
        row.benchmarkReturnPercent !== null &&
        row.excessReturnPercent !== null,
    )

  if (
    !referenceRow ||
    referenceRow.ttwoReturnPercent === null ||
    referenceRow.benchmarkReturnPercent === null ||
    referenceRow.excessReturnPercent === null
  ) {
    return 'Os horizontes comparáveis de 1, 5 e 30 pregões ainda estão em formação para este evento.'
  }

  const benchmarkSymbol =
    impact.benchmarkSymbol?.trim() || 'QQQ'

  const ttwoReturn =
    referenceRow.ttwoReturnPercent
  const benchmarkReturn =
    referenceRow.benchmarkReturnPercent
  const excessReturn =
    referenceRow.excessReturnPercent

  const absoluteExcess = Math.abs(excessReturn)
    .toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const relativeReading =
    Math.abs(excessReturn) < 0.1
      ? `ficou praticamente alinhada ao ${benchmarkSymbol}`
      : excessReturn > 0
        ? `teve desempenho relativo ${absoluteExcess} p.p. acima do ${benchmarkSymbol}`
        : `ficou ${absoluteExcess} p.p. abaixo do ${benchmarkSymbol}`

  return (
    `Em ${referenceRow.label}, a TTWO registrou ${formatSignedPercent(
      ttwoReturn,
    )}, enquanto o ${benchmarkSymbol} marcou ${formatSignedPercent(
      benchmarkReturn,
    )}; a ação ${relativeReading}.`
  )
}

function getAnalysisMarketHighlights(
  impact: GtaEventImpact | undefined,
  isLoading: boolean,
  hasError: boolean,
): string[] {
  if (hasError) {
    return [
      'A leitura quantitativa está temporariamente indisponível. Os indicadores podem ser recarregados sem perder o contexto do evento.',
    ]
  }

  if (isLoading && !impact) {
    return [
      'Os indicadores de mercado deste evento ainda estão sendo calculados.',
    ]
  }

  if (!impact) {
    return [
      'Ainda não há uma leitura de mercado disponível para este evento.',
    ]
  }

  if (!impact.isAvailable) {
    return [
      impact.unavailableReason ??
        'Ainda não existem dados históricos suficientes para construir uma leitura de mercado confiável para este evento.',
    ]
  }

  const highlights: string[] = []

  if (impact.benchmarkIsAvailable) {
    if (impact.sameDayReturnPercent !== null) {
      highlights.push(
        `No mesmo pregão, a TTWO registrou ${formatSignedPercent(
          impact.sameDayReturnPercent,
        )}.`,
      )
    }
  } else {
    if (impact.day1ReturnPercent !== null) {
      highlights.push(
        `Após 1 pregão, a TTWO registrou ${formatSignedPercent(
          impact.day1ReturnPercent,
        )}.`,
      )
    }

    if (impact.day5ReturnPercent !== null) {
      highlights.push(
        `Em 5 pregões, o movimento acumulado chegou a ${formatSignedPercent(
          impact.day5ReturnPercent,
        )}.`,
      )
    } else if (impact.sameDayReturnPercent !== null) {
      highlights.push(
        `No mesmo pregão, a variação observada foi ${formatSignedPercent(
          impact.sameDayReturnPercent,
        )}.`,
      )
    }

    if (impact.day30ReturnPercent !== null) {
      highlights.push(
        `Em 30 pregões, a variação observada foi ${formatSignedPercent(
          impact.day30ReturnPercent,
        )}.`,
      )
    }
  }

  if (impact.volumeChangePercent !== null) {
    const direction =
      impact.volumeChangePercent >= 0
        ? 'acima'
        : 'abaixo'

    const absoluteVolumeChange =
      Math.abs(impact.volumeChangePercent)
        .toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

    highlights.push(
      `O volume negociado ficou ${absoluteVolumeChange}% ${direction} da média usada na análise.`,
    )
  }

  if (highlights.length === 0) {
    return [
      'Os dados do pregão já foram identificados, mas os percentuais de reação ainda não estão disponíveis.',
    ]
  }

  return highlights.slice(0, 4)
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
  timeSeries: StockTimeSeries | null,
): string {
  const historicalPrices =
    timeSeries?.values
      .slice(-28)
      .map((value) => value.close)
      .filter((price) =>
        Number.isFinite(price),
      ) ?? []

  const prices =
    historicalPrices.length >= 2
      ? historicalPrices
      : getSortedQuotes(quotes)
          .slice(-28)
          .map((quote) => quote.price)

  if (prices.length === 0) {
    return '0,26 180,26'
  }

  if (prices.length === 1) {
    return '0,28 180,28'
  }

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

interface AnalysisMetricSparklineData {
  preEventPoints: string
  postEventPoints: string
  areaPoints: string
  baselineY: number
  eventX: number
  eventY: number
  endX: number
  endY: number
}

function createAnalysisMetricSparklineData(
  timeSeries: StockTimeSeries | null,
  analysisDateText: string,
  horizon: number,
): AnalysisMetricSparklineData | null {
  if (!timeSeries || timeSeries.values.length < 2) {
    return null
  }

  const values = [...timeSeries.values].sort(
    (firstValue, secondValue) =>
      parseUtcDate(
        firstValue.dateTimeUtc,
      ).getTime() -
      parseUtcDate(
        secondValue.dateTimeUtc,
      ).getTime(),
  )

  const analysisTimestamp = parseUtcDate(
    analysisDateText,
  ).getTime()

  const firstAnalysisIndex = values.findIndex(
    (value) =>
      parseUtcDate(
        value.dateTimeUtc,
      ).getTime() >= analysisTimestamp,
  )

  if (firstAnalysisIndex < 0) {
    return null
  }

  // Keep a few sessions before the event in every miniature chart.
  // The card still reports its own 1/5/30-session return, while the
  // sparkline gives enough pre-event context to show the trajectory.
  const sessionsBeforeEvent = 6
  const startIndex = Math.max(
    0,
    firstAnalysisIndex - sessionsBeforeEvent,
  )

  const endIndex = Math.min(
    values.length,
    firstAnalysisIndex + horizon + 1,
  )

  const chartValues = values
    .slice(startIndex, endIndex)
    .filter((value) =>
      Number.isFinite(value.close),
    )

  if (chartValues.length < 2) {
    return null
  }

  const prices = chartValues.map(
    (value) => value.close,
  )

  const minimumPrice = Math.min(...prices)
  const maximumPrice = Math.max(...prices)
  const priceRange =
    maximumPrice - minimumPrice || 1

  const chartWidth = 128
  const chartTop = 4
  const chartBottom = 38
  const chartHeight = chartBottom - chartTop

  const coordinates = prices.map(
    (price, index) => {
      const x =
        (index / (prices.length - 1)) *
        chartWidth

      const y =
        chartBottom -
        ((price - minimumPrice) /
          priceRange) *
          chartHeight

      return {
        x,
        y,
      }
    },
  )

  const eventIndex = Math.max(
    0,
    Math.min(
      coordinates.length - 1,
      firstAnalysisIndex - startIndex,
    ),
  )

  const eventPoint = coordinates[eventIndex]
  const baselinePoint =
    coordinates[Math.max(0, eventIndex - 1)]
  const endPoint = coordinates.at(-1) ?? eventPoint

  const preEventCoordinates = coordinates.slice(
    0,
    eventIndex + 1,
  )
  const postEventCoordinates = coordinates.slice(
    eventIndex,
  )

  const formatCoordinates = (
    chartCoordinates: Array<{ x: number; y: number }>,
  ) =>
    chartCoordinates
      .map(
        ({ x, y }) =>
          `${x.toFixed(2)},${y.toFixed(2)}`,
      )
      .join(' ')

  return {
    preEventPoints: formatCoordinates(
      preEventCoordinates,
    ),
    postEventPoints: formatCoordinates(
      postEventCoordinates,
    ),
    areaPoints: [
      `${eventPoint.x.toFixed(2)},${chartBottom}`,
      ...postEventCoordinates.map(
        ({ x, y }) =>
          `${x.toFixed(2)},${y.toFixed(2)}`,
      ),
      `${endPoint.x.toFixed(2)},${chartBottom}`,
    ].join(' '),
    baselineY: baselinePoint.y,
    eventX: eventPoint.x,
    eventY: eventPoint.y,
    endX: endPoint.x,
    endY: endPoint.y,
  }
}

interface VolumeVisualization {
  bars: number[]
  averageHeight: number | null
}

function createVolumeVisualization(
  quotes: StockQuote[],
  timeSeries: StockTimeSeries | null,
  averageVolume: number | null,
): VolumeVisualization {
  const historicalVolumes =
    timeSeries?.values
      .slice(-13)
      .map((value) => value.volume)
      .filter((volume) => volume > 0) ?? []

  const volumes =
    historicalVolumes.length >= 2
      ? historicalVolumes
      : getSortedQuotes(quotes)
          .slice(-13)
          .map((quote) => quote.volume)
          .filter((volume) => volume > 0)

  if (volumes.length === 0) {
    return {
      bars: [
        24,
        22,
        27,
        31,
        26,
        36,
        29,
        33,
        28,
        35,
        31,
        34,
        32,
      ],
      averageHeight: null,
    }
  }

  const sortedVolumes = [...volumes].sort(
    (firstVolume, secondVolume) =>
      firstVolume - secondVolume,
  )

  const percentileIndex = Math.min(
    sortedVolumes.length - 1,
    Math.floor(
      (sortedVolumes.length - 1) * 0.82,
    ),
  )

  const scaleMaximum =
    sortedVolumes[percentileIndex] || 1

  const bars = volumes.map((volume) => {
    const normalizedVolume =
      Math.min(volume, scaleMaximum) /
      scaleMaximum

    return Math.max(
      8,
      Math.round(
        Math.sqrt(normalizedVolume) * 42,
      ),
    )
  })

  const averageHeight =
    averageVolume &&
    averageVolume > 0
      ? Math.max(
          7,
          Math.min(
            42,
            Math.round(
              Math.sqrt(
                Math.min(
                  averageVolume,
                  scaleMaximum,
                ) / scaleMaximum,
              ) * 42,
            ),
          ),
        )
      : null

  return {
    bars,
    averageHeight,
  }
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
    return 'Média de 30 dias indisponível'
  }

  if (Math.abs(changePercent) < 0.01) {
    return 'Na média de 30 dias'
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


interface ApiErrorNoticeProps {
  error: ApiRequestError
  onRetry?: () => void
  compact?: boolean
  staleMessage?: string
  className?: string
}

function ApiErrorNotice({
  error,
  onRetry,
  compact = false,
  staleMessage,
  className,
}: ApiErrorNoticeProps) {
  const retryHint = getRetryHint(error)

  return (
    <div
      className={[
        'api-error-notice',
        compact ? 'compact' : '',
        staleMessage ? 'stale-data' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="alert"
    >
      <div className="api-error-copy">
        <strong>{error.title}</strong>
        <p>{error.message}</p>

        {staleMessage && (
          <small>{staleMessage}</small>
        )}

        {retryHint && (
          <small>{retryHint}</small>
        )}
      </div>

      {onRetry && error.canRetry && (
        <button
          type="button"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

const EVENT_ANALYSIS_ROUTE_PREFIX = '/events/'

function getInitialAnalysisEventKey(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const currentUrl = new URL(
    window.location.href,
  )
  const normalizedPathname =
    currentUrl.pathname.replace(/\/+$/, '') || '/'

  if (
    normalizedPathname.startsWith(
      EVENT_ANALYSIS_ROUTE_PREFIX,
    )
  ) {
    const encodedEventKey =
      normalizedPathname.slice(
        EVENT_ANALYSIS_ROUTE_PREFIX.length,
      )

    if (encodedEventKey) {
      try {
        return decodeURIComponent(
          encodedEventKey,
        )
      } catch {
        return encodedEventKey
      }
    }
  }

  const legacyEventKey =
    currentUrl.searchParams.get('event')

  return legacyEventKey?.trim() || null
}

function createEventAnalysisPath(
  eventKey: string,
): string {
  return `${EVENT_ANALYSIS_ROUTE_PREFIX}${encodeURIComponent(eventKey)}`
}

function getEventAnalysisRouteKey(
  gtaEvent: GtaEvent,
): string {
  const slug = gtaEvent.slug?.trim()

  return slug || gtaEvent.id
}

function getEventAnalysisShareUrl(
  gtaEvent: GtaEvent,
): string {
  return new URL(
    createEventAnalysisPath(
      getEventAnalysisRouteKey(gtaEvent),
    ),
    window.location.origin,
  ).toString()
}

async function copyTextToClipboard(
  value: string,
): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textArea = document.createElement(
    'textarea',
  )
  textArea.value = value
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.select()

  const didCopy = document.execCommand('copy')
  document.body.removeChild(textArea)

  if (!didCopy) {
    throw new Error('Clipboard copy failed.')
  }
}

function findAnalysisEvent(
  events: GtaEvent[],
  eventKey: string | null,
): GtaEvent | null {
  if (!eventKey) {
    return null
  }

  return (
    events.find(
      (gtaEvent) =>
        gtaEvent.slug === eventKey ||
        gtaEvent.id === eventKey,
    ) ?? null
  )
}

interface EventPreviewImpactSummary {
  label: string
  value: number
}

function getEventPreviewImpactSummary(
  impact: GtaEventImpact | undefined,
): EventPreviewImpactSummary | null {
  if (!impact?.isAvailable) {
    return null
  }

  const candidates = [
    {
      label: 'Após 1 pregão',
      value: impact.day1ReturnPercent,
    },
    {
      label: 'No mesmo pregão',
      value: impact.sameDayReturnPercent,
    },
    {
      label: 'Após 5 pregões',
      value: impact.day5ReturnPercent,
    },
    {
      label: 'Após 30 pregões',
      value: impact.day30ReturnPercent,
    },
  ]

  const availableCandidate =
    candidates.find(
      (candidate) =>
        typeof candidate.value === 'number',
    )

  if (
    !availableCandidate ||
    typeof availableCandidate.value !== 'number'
  ) {
    return null
  }

  return {
    label: availableCandidate.label,
    value: availableCandidate.value,
  }
}

function getEventPreviewImpactTone(
  value: number,
): 'positive' | 'negative' | 'neutral' {
  if (value > 0) {
    return 'positive'
  }

  if (value < 0) {
    return 'negative'
  }

  return 'neutral'
}

function getEventPreviewImpactLabel(
  value: number,
): string {
  if (value > 0) {
    return 'Reação positiva'
  }

  if (value < 0) {
    return 'Reação negativa'
  }

  return 'Reação neutra'
}

function App() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [timeSeries, setTimeSeries] =
    useState<StockTimeSeries | null>(null)

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
  ] = useState<ApiRequestError | null>(null)

  const [
    chartError,
    setChartError,
  ] = useState<ApiRequestError | null>(null)

  const [
    dashboardReloadRequest,
    setDashboardReloadRequest,
  ] = useState(0)

  const [
    chartReloadRequest,
    setChartReloadRequest,
  ] = useState(0)

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
    impactRanking,
    setImpactRanking,
  ] = useState<GtaEventImpact[]>([])

  const [
    selectedRankingPeriod,
    setSelectedRankingPeriod,
  ] = useState<ImpactRankingPeriod>('5D')

  const [
    isImpactRankingCollapsed,
    setIsImpactRankingCollapsed,
  ] = useState(true)

  const [
    impactRankingSearch,
    setImpactRankingSearch,
  ] = useState('')

  const [
    impactRankingDirection,
    setImpactRankingDirection,
  ] = useState<ImpactRankingDirection>('ALL')

  const [
    impactRankingCategory,
    setImpactRankingCategory,
  ] = useState('ALL')

  const [
    impactRankingSort,
    setImpactRankingSort,
  ] = useState<ImpactRankingSort>(
    'IMPACT_DESC',
  )

  const [
    timelineMode,
    setTimelineMode,
  ] = useState<TimelineMode>('PERIOD')

  const [
    isImpactRankingLoading,
    setIsImpactRankingLoading,
  ] = useState(true)

  const [
    impactRankingError,
    setImpactRankingError,
  ] = useState<ApiRequestError | null>(null)

  const [
    impactRankingReloadRequest,
    setImpactRankingReloadRequest,
  ] = useState(0)

  const [
    loadingEventImpactIds,
    setLoadingEventImpactIds,
  ] = useState<Set<string>>(new Set())

  const [
    eventImpactErrors,
    setEventImpactErrors,
  ] = useState<
    Record<string, ApiRequestError>
  >({})

  const eventImpactRequestsRef =
    useRef<Set<string>>(new Set())

  const eventsListRef =
    useRef<HTMLDivElement | null>(null)

  const timelineReturnTimeoutRef =
    useRef<number | null>(null)

  const [
    timelineScrollRequest,
    setTimelineScrollRequest,
  ] = useState(0)

  const [
    analysisEventKey,
    setAnalysisEventKey,
  ] = useState<string | null>(
    getInitialAnalysisEventKey,
  )

  const [
    shareFeedback,
    setShareFeedback,
  ] = useState<string | null>(null)

  const shareFeedbackTimeoutRef =
    useRef<number | null>(null)

  useEffect(() => {
    function syncAnalysisRoute() {
      setAnalysisEventKey(
        getInitialAnalysisEventKey(),
      )
    }

    window.addEventListener(
      'popstate',
      syncAnalysisRoute,
    )

    return () => {
      window.removeEventListener(
        'popstate',
        syncAnalysisRoute,
      )
    }
  }, [])

  useEffect(() => {
    return () => {
      if (shareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(
          shareFeedbackTimeoutRef.current,
        )
      }
    }
  }, [])

  useEffect(() => {
    if (!dashboard || !analysisEventKey) {
      return
    }

    const analysisEvent = findAnalysisEvent(
      dashboard.gtaEvents,
      analysisEventKey,
    )

    if (!analysisEvent) {
      return
    }

    const currentUrl = new URL(
      window.location.href,
    )
    const canonicalEventKey =
      getEventAnalysisRouteKey(analysisEvent)
    const canonicalPath =
      createEventAnalysisPath(
        canonicalEventKey,
      )
    const normalizedCurrentPath =
      currentUrl.pathname.replace(/\/+$/, '') || '/'

    if (
      normalizedCurrentPath === canonicalPath &&
      !currentUrl.searchParams.has('event') &&
      analysisEventKey === canonicalEventKey
    ) {
      return
    }

    currentUrl.pathname = canonicalPath
    currentUrl.searchParams.delete('event')

    window.history.replaceState(
      {
        eventSlug: canonicalEventKey,
      },
      '',
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    )

    if (analysisEventKey !== canonicalEventKey) {
      setAnalysisEventKey(
        canonicalEventKey,
      )
    }
  }, [analysisEventKey, dashboard])

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

  useEffect(
    () => () => {
      if (
        timelineReturnTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          timelineReturnTimeoutRef.current,
        )
      }
    },
    [],
  )

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
    if (!dashboard || !analysisEventKey) {
      return
    }

    const analysisEvent = findAnalysisEvent(
      dashboard.gtaEvents,
      analysisEventKey,
    )

    if (!analysisEvent) {
      return
    }

    const focusRange =
      createEventFocusRange(
        analysisEvent.occurredAtUtc,
      )

    const requiresReload =
      selectedPeriod !== 'CUSTOM' ||
      focusRange.startDate !==
        appliedCustomStartDate ||
      focusRange.endDate !==
        appliedCustomEndDate

    setSelectedEventId(analysisEvent.id)
    setExpandedEventId(null)
    setCustomStartDate(
      focusRange.startDate,
    )
    setCustomEndDate(
      focusRange.endDate,
    )

    if (requiresReload) {
      setIsChartLoading(true)
      setChartError(null)
      setAppliedCustomStartDate(
        focusRange.startDate,
      )
      setAppliedCustomEndDate(
        focusRange.endDate,
      )
      setSelectedPeriod('CUSTOM')
    }
  }, [
    analysisEventKey,
    appliedCustomEndDate,
    appliedCustomStartDate,
    dashboard,
    selectedPeriod,
  ])

  useEffect(() => {
    if (!dashboard || !analysisEventKey) {
      return
    }

    const analysisEvent = findAnalysisEvent(
      dashboard.gtaEvents,
      analysisEventKey,
    )

    if (
      !analysisEvent ||
      analysisEvent.isImpactAnalysisEligible ===
        false ||
      eventImpacts[analysisEvent.id] ||
      eventImpactRequestsRef.current.has(
        analysisEvent.id,
      )
    ) {
      return
    }

    const analysisEventIdForRequest =
      analysisEvent.id

    const analysisSymbol =
      dashboard.symbol ?? 'TTWO'

    let isActive = true

    eventImpactRequestsRef.current.add(
      analysisEventIdForRequest,
    )

    setLoadingEventImpactIds(
      (currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.add(analysisEventIdForRequest)
        return nextIds
      },
    )

    setEventImpactErrors(
      (currentErrors) => {
        const nextErrors = {
          ...currentErrors,
        }

        delete nextErrors[analysisEventIdForRequest]
        return nextErrors
      },
    )

    async function loadAnalysisImpact() {
      try {
        const impact =
          await getGtaEventImpact(
            analysisEventIdForRequest,
            analysisSymbol,
          )

        if (!isActive) {
          return
        }

        setEventImpacts(
          (currentImpacts) => ({
            ...currentImpacts,
            [analysisEventIdForRequest]: impact,
          }),
        )
      } catch (error) {
        if (!isActive) {
          return
        }

        setEventImpactErrors(
          (currentErrors) => ({
            ...currentErrors,
            [analysisEventIdForRequest]:
              toApiRequestError(
                error,
                'Não foi possível calcular o movimento observado.',
              ),
          }),
        )
      } finally {
        eventImpactRequestsRef.current.delete(
          analysisEventIdForRequest,
        )

        if (isActive) {
          setLoadingEventImpactIds(
            (currentIds) => {
              const nextIds =
                new Set(currentIds)
              nextIds.delete(
                analysisEventIdForRequest,
              )
              return nextIds
            },
          )
        }
      }
    }

    void loadAnalysisImpact()

    return () => {
      isActive = false
    }
  }, [
    analysisEventKey,
    dashboard,
    eventImpacts,
  ])

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
      setIsDashboardLoading(true)
      setDashboardError(null)

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
            toApiRequestError(
              error,
              'Não foi possível carregar o dashboard.',
            ),
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
  }, [dashboardReloadRequest])

  useEffect(() => {
    const abortController =
      new AbortController()

    async function loadImpactRanking() {
      setIsImpactRankingLoading(true)
      setImpactRankingError(null)

      try {
        const ranking =
          await getGtaEventImpactRanking(
            'TTWO',
            'QQQ',
            abortController.signal,
          )

        setImpactRanking(ranking)
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return
        }

        setImpactRankingError(
          toApiRequestError(
            error,
            'Não foi possível carregar o ranking.',
          ),
        )
      } finally {
        if (!abortController.signal.aborted) {
          setIsImpactRankingLoading(false)
        }
      }
    }

    void loadImpactRanking()

    return () => {
      abortController.abort()
    }
  }, [impactRankingReloadRequest])

  useEffect(() => {
    let isActive = true

    async function loadDailyPerformance() {
      try {
        const dailyTimeSeries =
          await getStockTimeSeries(
            'TTWO',
            {
              period: '1D',
            },
          )

        if (isActive) {
          setPeriodPerformances(
            (currentPerformances) =>
              mergePeriodPerformances(
                currentPerformances,
                dailyTimeSeries.performances,
                '1D',
              ),
          )
        }
      } catch {
        // The main chart remains available even if this
        // background performance request temporarily fails.
      }
    }

    void loadDailyPerformance()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadWeeklyPerformance() {
      try {
        const weeklyTimeSeries =
          await getStockTimeSeries(
            'TTWO',
            {
              period: '7D',
            },
          )

        if (isActive) {
          setPeriodPerformances(
            (currentPerformances) =>
              mergePeriodPerformances(
                currentPerformances,
                weeklyTimeSeries.performances,
                '7D',
              ),
          )
        }
      } catch {
        // The main chart remains available even if this
        // background performance request temporarily fails.
      }
    }

    void loadWeeklyPerformance()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    setIsChartLoading(true)
    setChartError(null)

    const timeoutId =
      window.setTimeout(() => {
        async function loadTimeSeries() {
          try {
            const timeSeriesData =
              await getStockTimeSeries(
                'TTWO',
                {
                  period:
                    selectedPeriod,

                  startDate:
                    selectedPeriod ===
                    'CUSTOM'
                      ? appliedCustomStartDate
                      : undefined,

                  endDate:
                    selectedPeriod ===
                    'CUSTOM'
                      ? appliedCustomEndDate
                      : undefined,
                },
              )

            if (isActive) {
              setPeriodPerformances(
                (currentPerformances) =>
                  mergePeriodPerformances(
                    currentPerformances,
                    timeSeriesData.performances,
                    selectedPeriod,
                  ),
              )

              setTimeSeries(
                timeSeriesData,
              )
            }
          } catch (error) {
            if (isActive) {
              setChartError(
                toApiRequestError(
                  error,
                  'Não foi possível carregar o histórico.',
                ),
              )
            }
          } finally {
            if (isActive) {
              setIsChartLoading(false)
            }
          }
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
    chartReloadRequest,
  ])

  function prepareChartReload() {
    setIsChartLoading(true)
    setChartError(null)
  }

  function retryChartLoad() {
    prepareChartReload()
    setChartReloadRequest(
      (currentRequest) =>
        currentRequest + 1,
    )
  }

  function retryDashboardLoad() {
    setDashboardReloadRequest(
      (currentRequest) =>
        currentRequest + 1,
    )
  }

  function retryImpactRankingLoad() {
    setImpactRankingReloadRequest(
      (currentRequest) =>
        currentRequest + 1,
    )
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
            toApiRequestError(
              error,
              'Não foi possível calcular o movimento observado.',
            ),
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

  function cancelTimelineReturn() {
    if (
      timelineReturnTimeoutRef.current ===
      null
    ) {
      return
    }

    window.clearTimeout(
      timelineReturnTimeoutRef.current,
    )

    timelineReturnTimeoutRef.current = null
  }

  function scheduleTimelineReturnToLatest() {
    cancelTimelineReturn()

    timelineReturnTimeoutRef.current =
      window.setTimeout(() => {
        setExpandedEventId(null)

        eventsListRef.current?.scrollTo({
          top: 0,
          behavior: 'smooth',
        })

        timelineReturnTimeoutRef.current =
          null
      }, 10000)
  }

  function handleChartEventSelect(
    gtaEvent: GtaEvent,
  ) {
    setExpandedEventId(gtaEvent.id)
    setTimelineScrollRequest(
      (currentRequest) =>
        currentRequest + 1,
    )
    focusEventOnChart(gtaEvent)
    scheduleTimelineReturnToLatest()
  }

  function handleTimelineEventSelect(
    gtaEvent: GtaEvent,
  ) {
    cancelTimelineReturn()

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

  function openEventAnalysis(
    gtaEvent: GtaEvent,
  ) {
    cancelTimelineReturn()

    const nextUrl = new URL(
      window.location.href,
    )
    const eventRouteKey =
      getEventAnalysisRouteKey(gtaEvent)

    nextUrl.pathname = createEventAnalysisPath(
      eventRouteKey,
    )
    nextUrl.searchParams.delete('event')

    window.history.pushState(
      {
        eventSlug: eventRouteKey,
      },
      '',
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
    )

    setAnalysisEventKey(eventRouteKey)
    setShareFeedback(null)
    setExpandedEventId(null)
    setSelectedEventId(gtaEvent.id)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function showShareFeedback(
    message: string,
  ) {
    setShareFeedback(message)

    if (shareFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(
        shareFeedbackTimeoutRef.current,
      )
    }

    shareFeedbackTimeoutRef.current =
      window.setTimeout(() => {
        setShareFeedback(null)
        shareFeedbackTimeoutRef.current = null
      }, 2400)
  }

  async function copyEventAnalysisLink(
    gtaEvent: GtaEvent,
  ) {
    try {
      await copyTextToClipboard(
        getEventAnalysisShareUrl(gtaEvent),
      )
      showShareFeedback('Link copiado')
    } catch {
      showShareFeedback(
        'Não foi possível copiar o link',
      )
    }
  }

  async function shareEventAnalysis(
    gtaEvent: GtaEvent,
  ) {
    const shareUrl =
      getEventAnalysisShareUrl(gtaEvent)

    const shareText = `${gtaEvent.title} — VI Impact\nVeja a análise do evento e a reação da TTWO:\n${shareUrl}`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          text: shareText,
        })
        showShareFeedback('Compartilhado')
        return
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return
        }
      }
    }

    await copyEventAnalysisLink(gtaEvent)
  }

  function closeEventAnalysis() {
    const returningEvent =
      dashboard
        ? findAnalysisEvent(
            dashboard.gtaEvents,
            analysisEventKey,
          )
        : null
    const nextUrl = new URL(
      window.location.href,
    )

    nextUrl.pathname = '/'
    nextUrl.searchParams.delete('event')

    window.history.pushState(
      {},
      '',
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
    )

    const returningEventId =
      returningEvent?.id ?? null

    setAnalysisEventKey(null)
    setShareFeedback(null)
    setSelectedEventId(returningEventId)
    setExpandedEventId(returningEventId)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function renderThemeToggle(
    actionsClassName?: string,
  ) {
    return (
      <div
        className={[
          'topbar-actions',
          actionsClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
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
    )
  }

  function renderTopbar(
    onBrandActivate?: () => void,
  ) {
    return (
      <header className="topbar">
        <a
          className="brand-link"
          href="#dashboard"
          aria-label={
            onBrandActivate
              ? 'Voltar ao dashboard'
              : 'Ir para o dashboard'
          }
          onClick={
            onBrandActivate
              ? (event) => {
                  event.preventDefault()
                  onBrandActivate()
                }
              : undefined
          }
        >
          <img
            className="brand-logo"
            src="/vi-impact-logo.png"
            alt="VI Impact"
          />
        </a>

        {renderThemeToggle()}
      </header>
    )
  }

  if (
    isDashboardLoading &&
    !dashboard
  ) {
    return (
      <main
        className="loading-splash"
        role="status"
        aria-live="polite"
        aria-label="Carregando dados do VI Impact"
      >
        <div
          className="loading-splash-frame"
          aria-hidden="true"
        />

        <div className="loading-splash-content">
          <img
            className="loading-splash-logo"
            src="/vi-impact-logo.png"
            alt="VI Impact"
          />

          <div className="loading-splash-heading">
            <span className="loading-splash-kicker">
              Take-Two × GTA VI
            </span>

            <strong>Análise de eventos e mercado</strong>
          </div>

          <div
            className="loading-splash-progress"
            aria-hidden="true"
          >
            <span />
          </div>

          <p className="loading-splash-message">
            Carregando dados do mercado
          </p>

          <span className="loading-splash-meta">
            TTWO · NASDAQ · VI IMPACT
          </span>
        </div>
      </main>
    )
  }

  if (dashboardError && !dashboard) {
    return (
      <main className="status-screen">
        <ApiErrorNotice
          error={dashboardError}
          onRetry={retryDashboardLoad}
          className="full-page"
        />
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
      timeSeries,
    )

  const volumeVisualization =
    createVolumeVisualization(
      dashboard.quotes,
      timeSeries,
      averageVolume30Sessions,
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

  const nextRegularSessionLabel =
    getNextRegularSessionLabel(
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

  const occurredEvents =
    [...dashboard.gtaEvents]
      .filter((gtaEvent) =>
        isOccurredGtaEvent(gtaEvent),
      )
      .sort((firstEvent, secondEvent) => {
        const timestampDifference =
          parseUtcDate(
            secondEvent.occurredAtUtc,
          ).getTime() -
          parseUtcDate(
            firstEvent.occurredAtUtc,
          ).getTime()

        if (timestampDifference !== 0) {
          return timestampDifference
        }

        return firstEvent.title.localeCompare(
          secondEvent.title,
          'pt-BR',
          {
            sensitivity: 'base',
          },
        )
      })

  const chartEventImpactSummaries =
    [...impactRanking, ...Object.values(eventImpacts)]
      .reduce<
        Record<
          string,
          EventPreviewImpactSummary
        >
      >((summaries, impact) => {
        const summary =
          getEventPreviewImpactSummary(impact)

        if (summary) {
          summaries[impact.eventId] = summary
        }

        return summaries
      }, {})

  const analysisEvent = findAnalysisEvent(
    dashboard.gtaEvents,
    analysisEventKey,
  )

  if (analysisEventKey && !analysisEvent) {
    return (
      <div className="app-shell event-analysis-shell">
        {renderTopbar(closeEventAnalysis)}

        <main className="event-analysis-page">
          <section className="event-analysis-not-found">
            <span>Evento não encontrado</span>
            <h1>
              Esta análise não está disponível.
            </h1>
            <p>
              O link pode estar desatualizado ou o evento pode ter sido removido do catálogo.
            </p>
            <button
              type="button"
              onClick={closeEventAnalysis}
            >
              Voltar ao dashboard
            </button>
          </section>
        </main>
      </div>
    )
  }

  if (analysisEvent) {
    const eventStyle =
      getGtaEventPresentation(
        analysisEvent,
      )

    const categoryLabel =
      getGtaEventCategoryLabel(
        analysisEvent,
      ) ?? 'Não classificada'

    const priorityLabel =
      getGtaEventPriorityLabel(
        analysisEvent,
      ) ?? 'Não classificada'

    const confirmationLabel =
      getGtaEventConfirmationLabel(
        analysisEvent,
      )

    const sourceLabel =
      getGtaEventSourceLabel(
        analysisEvent,
      )

    const analysisImpact =
      eventImpacts[analysisEvent.id]

    const isAnalysisImpactLoading =
      loadingEventImpactIds.has(
        analysisEvent.id,
      )

    const analysisImpactError =
      eventImpactErrors[analysisEvent.id]

    const tradingDateExplanation =
      analysisImpact
        ? getTradingDateExplanation(
            analysisEvent,
            analysisImpact,
          )
        : null

    const analysisExchange =
      analysisImpact?.exchange ??
      timeSeries?.exchange ??
      'NASDAQ'

    const analysisMarketHighlights =
      getAnalysisMarketHighlights(
        analysisImpact,
        isAnalysisImpactLoading,
        Boolean(analysisImpactError),
      )

    const benchmarkComparisonRows =
      getBenchmarkComparisonRows(
        analysisImpact,
      )

    const benchmarkRelativeReading =
      getBenchmarkRelativeReading(
        analysisImpact,
        benchmarkComparisonRows,
      )

    const analysisBenchmarkSymbol =
      analysisImpact?.benchmarkSymbol?.trim() ||
      'QQQ'

    const analysisMetricCards = [
      {
        label: '1 pregão',
        horizon: 1,
        value:
          analysisImpact?.day1ReturnPercent ??
          null,
        detail:
          analysisImpact?.sameDayReturnPercent !== null &&
          analysisImpact?.sameDayReturnPercent !== undefined
            ? `No mesmo pregão ${formatSignedPercent(
                analysisImpact.sameDayReturnPercent,
              )}`
            : 'movimento observado após o evento',
        detailValue:
          analysisImpact?.sameDayReturnPercent ??
          null,
      },
      {
        label: '5 pregões',
        horizon: 5,
        value:
          analysisImpact?.day5ReturnPercent ??
          null,
        detail:
          analysisImpact?.day1ReturnPercent !== null &&
          analysisImpact?.day1ReturnPercent !== undefined
            ? `1 pregão ${formatSignedPercent(
                analysisImpact.day1ReturnPercent,
              )}`
            : 'movimento observado após o evento',
        detailValue:
          analysisImpact?.day1ReturnPercent ??
          null,
      },
      {
        label: '30 pregões',
        horizon: 30,
        value:
          analysisImpact?.day30ReturnPercent ??
          null,
        detail:
          analysisImpact?.day5ReturnPercent !== null &&
          analysisImpact?.day5ReturnPercent !== undefined
            ? `5 pregões ${formatSignedPercent(
                analysisImpact.day5ReturnPercent,
              )}`
            : 'movimento observado após o evento',
        detailValue:
          analysisImpact?.day5ReturnPercent ??
          null,
      },
    ]

    const priorityVisualLevel =
      priorityLabel
        .toLocaleLowerCase('pt-BR')
        .includes('alta')
        ? 3
        : priorityLabel
              .toLocaleLowerCase('pt-BR')
              .includes('média')
          ? 2
          : 1

    const analysisSparklineDate =
      analysisImpact?.effectiveTradingDate ??
      analysisEvent.occurredAtUtc

    const priorityNeedleEnd =
      priorityVisualLevel === 3
        ? { x: 79, y: 35 }
        : priorityVisualLevel === 2
          ? { x: 50, y: 18 }
          : { x: 21, y: 35 }

    return (
      <div className="app-shell event-analysis-shell">
        <main className="event-analysis-page">
          <section className="event-analysis-hero">
            <div className="event-analysis-hero-overlay" />

            <div className="event-analysis-hero-chrome">
              <button
                className="event-analysis-brand-button"
                type="button"
                onClick={closeEventAnalysis}
                aria-label="Voltar ao dashboard"
              >
                <img
                  src="/vi-impact-logo.png"
                  alt="VI Impact"
                />
              </button>

              {renderThemeToggle(
                'event-analysis-theme-actions',
              )}
            </div>

            <div className="event-analysis-hero-content">
              <div className="event-analysis-hero-actions">
                <button
                  className="event-analysis-back"
                  type="button"
                  onClick={closeEventAnalysis}
                >
                  <span
                    className="event-analysis-back-icon"
                    aria-hidden="true"
                  >
                    ←
                  </span>
                  <span>Voltar ao dashboard</span>
                </button>

                <div className="event-analysis-share-area">
                  <div className="event-analysis-share-actions">
                    <button
                      className="event-analysis-share-button"
                      type="button"
                      onClick={() =>
                        void shareEventAnalysis(
                          analysisEvent,
                        )
                      }
                      aria-label={`Compartilhar análise: ${analysisEvent.title}`}
                    >
                      <InterfaceIcon name="share" />
                      <span aria-live="polite">
                        {shareFeedback === 'Compartilhado'
                          ? 'Compartilhado'
                          : 'Compartilhar'}
                      </span>
                    </button>

                    <button
                      className="event-analysis-share-button secondary"
                      type="button"
                      onClick={() =>
                        void copyEventAnalysisLink(
                          analysisEvent,
                        )
                      }
                      aria-label="Copiar link da análise"
                    >
                      <InterfaceIcon name="copy" />
                      <span aria-live="polite">
                        {shareFeedback === 'Link copiado'
                          ? 'Link copiado'
                          : shareFeedback ===
                              'Não foi possível copiar o link'
                            ? 'Falha ao copiar'
                            : 'Copiar link'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <h1>{analysisEvent.title}</h1>

              <div className="event-analysis-meta">
                <time
                  dateTime={
                    analysisEvent.occurredAtUtc
                  }
                >
                  {formatGtaEventDate(
                    analysisEvent.occurredAtUtc,
                  )}
                </time>
                <span aria-hidden="true">•</span>
                <span>{sourceLabel}</span>
              </div>
            </div>
          </section>

          <section
            className="event-analysis-impact-overview"
            aria-labelledby="event-analysis-impact-heading"
          >
            <h2
              id="event-analysis-impact-heading"
              className="event-analysis-visually-hidden"
            >
              Impacto observado no preço da TTWO
            </h2>

            {analysisEvent.isImpactAnalysisEligible ===
            false ? (
              <div className="event-analysis-state-card">
                Este evento não está elegível para análise de impacto.
              </div>
            ) : analysisImpactError ? (
              <ApiErrorNotice
                error={analysisImpactError}
                onRetry={() =>
                  void loadEventImpact(
                    analysisEvent,
                  )
                }
                className="event-analysis-error"
              />
            ) : analysisImpact &&
              !analysisImpact.isAvailable ? (
              <div className="event-analysis-state-card">
                {analysisImpact.unavailableReason ??
                  'Não existem dados históricos suficientes para este evento.'}
              </div>
            ) : (
              <div className="event-analysis-metric-grid">
                {analysisMetricCards.map(
                  (metric) => {
                    const sparkline =
                      createAnalysisMetricSparklineData(
                        timeSeries,
                        analysisSparklineDate,
                        metric.horizon,
                      )

                    return (
                      <article
                        className="event-analysis-metric-card"
                        key={metric.label}
                      >
                        <div className="event-analysis-metric-card-header">
                          <span>{metric.label}</span>
                          <span
                            className="event-analysis-metric-icon"
                            aria-hidden="true"
                          >
                            <svg viewBox="0 0 24 24">
                              <rect
                                x="4"
                                y="5.5"
                                width="16"
                                height="14"
                                rx="3"
                              />
                              <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
                            </svg>
                          </span>
                        </div>

                        <div className="event-analysis-metric-card-body">
                          <div className="event-analysis-metric-copy">
                            <strong
                              className={getImpactValueClassName(
                                metric.value,
                              )}
                            >
                              {isAnalysisImpactLoading &&
                              !analysisImpact
                                ? 'Calculando…'
                                : formatImpactPercent(
                                    metric.value,
                                  )}
                            </strong>
                            <small
                              className={
                                metric.detailValue === null
                                  ? undefined
                                  : getImpactValueClassName(
                                      metric.detailValue,
                                    )
                              }
                            >
                              {metric.detail}
                            </small>
                          </div>

                          {sparkline && (
                            <svg
                              className={[
                                'event-analysis-metric-sparkline',
                                getImpactValueClassName(
                                  metric.value,
                                ),
                                metric.value === null
                                  ? 'pending'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              viewBox="0 0 128 44"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                            >
                              <polygon
                                className="event-analysis-metric-sparkline-area"
                                points={sparkline.areaPoints}
                              />
                              <line
                                className="event-analysis-metric-sparkline-baseline"
                                x1="0"
                                y1={sparkline.baselineY}
                                x2="128"
                                y2={sparkline.baselineY}
                              />
                              <line
                                className="event-analysis-metric-sparkline-event"
                                x1={sparkline.eventX}
                                y1="3"
                                x2={sparkline.eventX}
                                y2="40"
                              />
                              <polyline
                                className="event-analysis-metric-sparkline-pre"
                                points={sparkline.preEventPoints}
                                fill="none"
                                vectorEffect="non-scaling-stroke"
                              />
                              <polyline
                                className="event-analysis-metric-sparkline-post"
                                points={sparkline.postEventPoints}
                                fill="none"
                                vectorEffect="non-scaling-stroke"
                              />
                              <circle
                                className="event-analysis-metric-sparkline-point"
                                cx={sparkline.eventX}
                                cy={sparkline.eventY}
                                r="2.4"
                              />
                              <circle
                                className="event-analysis-metric-sparkline-end-halo"
                                cx={sparkline.endX}
                                cy={sparkline.endY}
                                r="4.2"
                              />
                              <circle
                                className="event-analysis-metric-sparkline-end"
                                cx={sparkline.endX}
                                cy={sparkline.endY}
                                r="2"
                              />
                            </svg>
                          )}
                        </div>
                      </article>
                    )
                  },
                )}

                <article className="event-analysis-metric-card editorial">
                  <div className="event-analysis-editorial-copy">
                    <span>Prioridade editorial</span>
                    <strong>{priorityLabel}</strong>
                    <small>
                      {analysisExchange} · {dashboard.symbol}
                    </small>
                  </div>

                  <div
                    className="event-analysis-priority-gauge"
                    aria-label={`Nível editorial ${priorityLabel}`}
                  >
                    <svg viewBox="0 0 100 62" aria-hidden="true">
                      <defs>
                        <linearGradient
                          id="event-analysis-priority-gradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#7844d7" />
                          <stop offset="55%" stopColor="#b94de9" />
                          <stop offset="100%" stopColor="#ff4aa6" />
                        </linearGradient>
                      </defs>
                      <path
                        className="event-analysis-priority-gauge-track"
                        d="M10 52 A40 40 0 0 1 90 52"
                      />
                      <path
                        className="event-analysis-priority-gauge-value"
                        d="M10 52 A40 40 0 0 1 90 52"
                      />
                      <line
                        className="event-analysis-priority-gauge-needle"
                        x1="50"
                        y1="52"
                        x2={priorityNeedleEnd.x}
                        y2={priorityNeedleEnd.y}
                      />
                      <circle
                        className="event-analysis-priority-gauge-hub"
                        cx="50"
                        cy="52"
                        r="4"
                      />
                    </svg>
                    <span className="event-analysis-priority-gauge-low">P3</span>
                    <span className="event-analysis-priority-gauge-high">P1</span>
                  </div>
                </article>
              </div>
            )}
          </section>

          <section className="event-analysis-layout">
            <div className="event-analysis-main-column">
              <article
                className="event-analysis-chart-panel"
                id="event-analysis-chart"
              >
                <div className="event-analysis-card-heading">
                  <h2>Preço da TTWO ao redor do evento</h2>

                  <span className="event-analysis-period-chip">
                    −14 a +14 dias
                  </span>
                </div>

                <div className="event-analysis-chart-content">
                  {isChartLoading ? (
                    <div className="chart-state-message">
                      Preparando janela do evento...
                    </div>
                  ) : !timeSeries && chartError ? (
                    <ApiErrorNotice
                      error={chartError}
                      onRetry={retryChartLoad}
                      className="chart-error-notice"
                    />
                  ) : timeSeries ? (
                    <Suspense
                      fallback={
                        <StockChartLoadingFallback />
                      }
                    >
                      <StockChart
                        values={timeSeries.values}
                        events={[analysisEvent]}
                        selectedEventId={
                          analysisEvent.id
                        }
                        eventImpactSummaries={
                          chartEventImpactSummaries
                        }
                        onEventSelect={() => undefined}
                      />
                    </Suspense>
                  ) : (
                    <div className="chart-state-message">
                      Nenhum histórico disponível para esta janela.
                    </div>
                  )}
                </div>

                {timeSeries && chartError && (
                  <ApiErrorNotice
                    error={chartError}
                    onRetry={retryChartLoad}
                    compact
                    staleMessage="O gráfico continua exibindo os últimos dados carregados com sucesso."
                    className="chart-stale-notice"
                  />
                )}

                <p className="event-analysis-chart-note">
                  A janela é centralizada no evento e limitada à data atual quando necessário. O movimento observado não comprova causalidade.
                </p>
              </article>

              {analysisImpact?.isAvailable && (
                <article className="event-analysis-market-panel">
                  <div className="event-analysis-card-heading">
                    <h2>Métricas de mercado</h2>
                  </div>

                  <div className="event-analysis-market-grid">
                    <div className="event-analysis-market-card price-reference">
                      <div className="event-analysis-market-card-heading">
                        <span
                          className="event-analysis-market-icon"
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M4 17.5 9 12l3 3 7-8" />
                            <path d="M15 7h4v4" />
                          </svg>
                        </span>
                        <span>Fechamento anterior</span>
                      </div>
                      <strong>
                        {formatImpactCurrency(
                          analysisImpact.previousClose,
                        )}
                      </strong>
                      <small>Referência antes do evento</small>
                    </div>

                    <div className="event-analysis-market-card opening-price">
                      <div className="event-analysis-market-card-heading">
                        <span
                          className="event-analysis-market-icon"
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M5 18V9" />
                            <path d="M12 18V5" />
                            <path d="M19 18v-6" />
                          </svg>
                        </span>
                        <span>Abertura no pregão</span>
                      </div>
                      <strong>
                        {formatImpactCurrency(
                          analysisImpact.eventDayOpen,
                        )}
                      </strong>
                      <small>Preço de abertura</small>
                    </div>

                    <div className="event-analysis-market-card closing-price">
                      <div className="event-analysis-market-card-heading">
                        <span
                          className="event-analysis-market-icon"
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M4 14.5 9 10l4 3 7-7" />
                            <path d="M16 6h4v4" />
                          </svg>
                        </span>
                        <span>Fechamento no pregão</span>
                      </div>
                      <strong>
                        {formatImpactCurrency(
                          analysisImpact.eventDayClose,
                        )}
                      </strong>
                      <small>Preço de fechamento</small>
                    </div>

                    <div className="event-analysis-market-card same-day">
                      <div className="event-analysis-market-card-heading">
                        <span
                          className="event-analysis-market-icon"
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M5 12h14" />
                            <path d="m15 8 4 4-4 4" />
                          </svg>
                        </span>
                        <span>No mesmo pregão</span>
                      </div>
                      <strong
                        className={getImpactValueClassName(
                          analysisImpact.sameDayReturnPercent,
                        )}
                      >
                        {formatImpactPercent(
                          analysisImpact.sameDayReturnPercent,
                        )}
                      </strong>
                      <small>Variação intradiária observada</small>
                    </div>

                    <div className="event-analysis-market-card volume">
                      <div className="event-analysis-market-card-heading">
                        <span
                          className="event-analysis-market-icon"
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M5 19v-5" />
                            <path d="M10 19V8" />
                            <path d="M15 19v-8" />
                            <path d="M20 19V5" />
                          </svg>
                        </span>
                        <span>Volume contra média</span>
                      </div>
                      <strong
                        className={getImpactValueClassName(
                          analysisImpact.volumeChangePercent,
                        )}
                      >
                        {formatImpactPercent(
                          analysisImpact.volumeChangePercent,
                        )}
                      </strong>
                      <small>Comparação com a média usada</small>
                    </div>
                  </div>
                </article>
              )}
            </div>

            <aside className="event-analysis-sidebar">
              <article className="event-analysis-context-card">
                <div className="event-analysis-card-heading compact">
                  <h2>O que aconteceu</h2>
                </div>

                <div
                  className="event-analysis-context-tags"
                  aria-label="Classificação do evento"
                >
                  <span
                    className={`event-analysis-context-tag ${eventStyle.className}`}
                  >
                    {categoryLabel}
                  </span>
                  <span className="event-analysis-context-tag priority">
                    {priorityLabel}
                  </span>
                </div>

                <p className="event-analysis-description">
                  {analysisEvent.description}
                </p>

                {analysisEvent.sourceUrl.trim() ? (
                  <a
                    className="event-analysis-source-link"
                    href={analysisEvent.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fonte original
                    <InterfaceIcon
                      name="external-link"
                      className="inline-action-icon"
                    />
                  </a>
                ) : (
                  <span className="event-detail-source-missing">
                    Fonte original pendente
                  </span>
                )}

                <section className="event-analysis-reading">
                  <h3 className="event-analysis-reading-title">
                    Leitura de mercado
                  </h3>

                  {analysisImpact?.isAvailable && (
                    <div className="event-analysis-benchmark">
                      <div className="event-analysis-benchmark-heading">
                        <div>
                          <span>Comparação relativa</span>
                          <strong>TTWO × {analysisBenchmarkSymbol}</strong>
                        </div>
                        <span className="event-analysis-benchmark-chip">
                          Benchmark
                        </span>
                      </div>

                      {analysisImpact.benchmarkIsAvailable ? (
                        <>
                          <div className="event-analysis-benchmark-table-wrap">
                            <table className="event-analysis-benchmark-table">
                              <thead>
                                <tr>
                                  <th scope="col">Período</th>
                                  <th scope="col">TTWO</th>
                                  <th scope="col">
                                    {analysisBenchmarkSymbol}
                                  </th>
                                  <th scope="col">Excesso</th>
                                </tr>
                              </thead>
                              <tbody>
                                {benchmarkComparisonRows.map(
                                  (row) => (
                                    <tr key={row.key}>
                                      <th scope="row">
                                        {row.label}
                                      </th>
                                      <td
                                        className={getImpactValueClassName(
                                          row.ttwoReturnPercent,
                                        )}
                                      >
                                        {row.ttwoReturnPercent === null
                                          ? '—'
                                          : formatSignedPercent(
                                              row.ttwoReturnPercent,
                                            )}
                                      </td>
                                      <td
                                        className={getImpactValueClassName(
                                          row.benchmarkReturnPercent,
                                        )}
                                      >
                                        {row.benchmarkReturnPercent === null
                                          ? '—'
                                          : formatSignedPercent(
                                              row.benchmarkReturnPercent,
                                            )}
                                      </td>
                                      <td
                                        className={getImpactValueClassName(
                                          row.excessReturnPercent,
                                        )}
                                      >
                                        {row.excessReturnPercent === null
                                          ? 'Ainda não disponível'
                                          : formatSignedPercentagePoints(
                                              row.excessReturnPercent,
                                            )}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>

                          <p className="event-analysis-benchmark-note">
                            Excesso = retorno da TTWO − retorno do {analysisBenchmarkSymbol}. “—” indica horizonte ainda sem dados.
                          </p>

                          {benchmarkRelativeReading && (
                            <p className="event-analysis-benchmark-reading">
                              {benchmarkRelativeReading}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="event-analysis-benchmark-unavailable">
                          <strong>Comparação indisponível</strong>
                          <span>
                            {analysisImpact.benchmarkUnavailableReason ??
                              `Ainda não existem dados suficientes do ${analysisBenchmarkSymbol} para comparar este evento.`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {analysisMarketHighlights.length > 0 && (
                    <ul className="event-analysis-highlight-list">
                      {analysisMarketHighlights.map(
                        (highlight) => (
                          <li key={highlight}>
                            <span
                              className="event-analysis-highlight-check"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span>{highlight}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  )}

                  {tradingDateExplanation && (
                    <p className="event-analysis-explanation">
                      {tradingDateExplanation}
                    </p>
                  )}
                </section>

                <div className="event-analysis-facts-list compact">
                  <div>
                    <span>Categoria</span>
                    <strong>{categoryLabel}</strong>
                  </div>
                  <div>
                    <span>Confirmação</span>
                    <strong>{confirmationLabel}</strong>
                  </div>
                  <div>
                    <span>Mercado</span>
                    <strong>
                      {analysisExchange} ({dashboard.symbol})
                    </strong>
                  </div>
                  <div>
                    <span>Pregão analisado</span>
                    <strong>
                      {analysisEvent.isImpactAnalysisEligible ===
                      false
                        ? 'Não aplicável'
                        : analysisImpact
                          ? formatTradingDate(
                              analysisImpact.effectiveTradingDate,
                            )
                          : 'Calculando...'}
                    </strong>
                  </div>
                </div>

                <p className="event-analysis-disclaimer">
                  Os percentuais descrevem movimentos observados nas ações da Take-Two ao redor do evento e não comprovam que ele foi a única causa das variações.
                </p>
              </article>
            </aside>
          </section>
        </main>
      </div>
    )
  }

  const chartDateKeys =
    timeSeries?.values.map((value) =>
      getUtcDateKey(value.dateTimeUtc),
    ) ?? []

  const chartStartDateKey =
    chartDateKeys.length > 0
      ? chartDateKeys.reduce(
          (earliestDateKey, dateKey) =>
            dateKey < earliestDateKey
              ? dateKey
              : earliestDateKey,
        )
      : null

  const chartEndDateKey =
    chartDateKeys.length > 0
      ? chartDateKeys.reduce(
          (latestDateKey, dateKey) =>
            dateKey > latestDateKey
              ? dateKey
              : latestDateKey,
        )
      : null

  const timelineEvents =
    timelineMode === 'ALL' ||
    chartStartDateKey === null ||
    chartEndDateKey === null
      ? occurredEvents
      : occurredEvents.filter(
          (gtaEvent) => {
            const eventDateKey =
              getUtcDateKey(
                gtaEvent.occurredAtUtc,
              )

            return (
              eventDateKey >=
                chartStartDateKey &&
              eventDateKey <=
                chartEndDateKey
            )
          },
        )

  const timelineEventGroups =
    groupTimelineEvents(timelineEvents)

  const rankingEntries = impactRanking
    .flatMap((impact) => {
      const gtaEvent =
        dashboard.gtaEvents.find(
          (candidateEvent) =>
            candidateEvent.id ===
            impact.eventId,
        )

      const impactValue =
        getRankingImpactValue(
          impact,
          selectedRankingPeriod,
        )

      if (
        !gtaEvent ||
        !impact.isAvailable ||
        impactValue === null
      ) {
        return []
      }

      const categoryLabel =
        getGtaEventCategoryLabel(
          gtaEvent,
        ) ?? 'Não classificada'

      return [
        {
          gtaEvent,
          impact,
          impactValue,
          categoryLabel,
        },
      ]
    })

  const impactRankingCategoryCounts =
    rankingEntries.reduce(
      (counts, entry) => {
        counts.set(
          entry.categoryLabel,
          (counts.get(
            entry.categoryLabel,
          ) ?? 0) + 1,
        )

        return counts
      },
      new Map<string, number>(),
    )

  const impactRankingCategories =
    Array.from(
      impactRankingCategoryCounts.keys(),
    ).sort(
      (
        firstCategory,
        secondCategory,
      ) =>
        firstCategory.localeCompare(
          secondCategory,
          'pt-BR',
        ),
    )

  const normalizedRankingSearch =
    normalizeRankingSearchText(
      impactRankingSearch,
    )

  const rankedEvents = rankingEntries
    .filter((entry) => {
      if (
        impactRankingDirection === 'UP' &&
        entry.impactValue <= 0
      ) {
        return false
      }

      if (
        impactRankingDirection === 'DOWN' &&
        entry.impactValue >= 0
      ) {
        return false
      }

      if (
        impactRankingCategory !== 'ALL' &&
        entry.categoryLabel !==
          impactRankingCategory
      ) {
        return false
      }

      if (!normalizedRankingSearch) {
        return true
      }

      const searchableText =
        normalizeRankingSearchText(
          [
            entry.gtaEvent.title,
            entry.gtaEvent.description,
            entry.gtaEvent.sourceName ?? '',
            entry.categoryLabel,
          ].join(' '),
        )

      return searchableText.includes(
        normalizedRankingSearch,
      )
    })
    .sort((firstEntry, secondEntry) => {
      if (impactRankingSort === 'RECENT') {
        return (
          parseUtcDate(
            secondEntry.gtaEvent.occurredAtUtc,
          ).getTime() -
          parseUtcDate(
            firstEntry.gtaEvent.occurredAtUtc,
          ).getTime()
        )
      }

      if (impactRankingSort === 'OLDEST') {
        return (
          parseUtcDate(
            firstEntry.gtaEvent.occurredAtUtc,
          ).getTime() -
          parseUtcDate(
            secondEntry.gtaEvent.occurredAtUtc,
          ).getTime()
        )
      }

      const impactDifference =
        Math.abs(
          secondEntry.impactValue,
        ) -
        Math.abs(
          firstEntry.impactValue,
        )

      return impactRankingSort ===
        'IMPACT_ASC'
        ? -impactDifference
        : impactDifference
    })

  const isImpactRankingOrder =
    impactRankingSort ===
      'IMPACT_DESC' ||
    impactRankingSort ===
      'IMPACT_ASC'

  const rankingPeriodLabel =
    impactRankingPeriodOptions.find(
      (periodOption) =>
        periodOption.value ===
        selectedRankingPeriod,
    )?.label.toLowerCase() ??
    'período selecionado'

  const unavailableRankingEventCount =
    Math.max(
      0,
      occurredEvents.length -
        rankingEntries.length,
    )

  const hasActiveRankingFilters =
    impactRankingDirection !== 'ALL' ||
    impactRankingCategory !== 'ALL' ||
    normalizedRankingSearch.length > 0


  return (
    <div className="app-shell">
      {renderTopbar()}

      <main
        className="dashboard"
        id="dashboard"
      >
        <section className="hero-banner">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              VI Impact · GTA VI × mercado
            </p>

            <h1>
              Take-Two Interactive ({dashboard.symbol})
            </h1>

            <p>
              Eventos de GTA VI e o desempenho da TTWO
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
                  <path d="M3 15h3l2-8 4 11 3-7 2 4h4" />
                </svg>
              </span>

              <span className="summary-card-title">
                Preço atual
              </span>
            </div>

            <div className="summary-card-main summary-card-main-stacked">
              <strong>
                {formatCurrency(
                  latestQuote.price,
                )}
              </strong>

              <span className="summary-card-symbol">
                {dashboard.symbol} · {exchangeName}
              </span>
            </div>

            <div className="summary-card-footer price-card-footer">
              <span className="market-status-indicator">
                <span
                  className={[
                    'live-dot',
                    marketStatus === 'Mercado aberto'
                      ? ''
                      : 'market-closed',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />

                {marketStatus}
              </span>

            </div>
          </article>

          <article className="summary-card variation-card">
            <div className="summary-card-heading">
              <span
                className={[
                  'summary-icon',
                  'variation-icon',
                  isPositive
                    ? 'positive'
                    : 'negative',
                ].join(' ')}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m4 7 5 5 4-4 7 7" />
                  <path d="M16 15h4v-4" />
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
                    {' '}desde o fechamento anterior
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
          </article>

          <article className="summary-card volume-card">
            <div className="summary-card-heading">
              <span className="summary-icon volume-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 19v-6M9 19V8M14 19v-9M19 19V4" />
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
              {volumeVisualization.bars.map(
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
          </article>

          <article className="summary-card update-card">
            <div className="summary-card-heading">
              <span className="summary-icon update-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
              </span>

              <span className="summary-card-title">
                Última atualização
              </span>
            </div>

            <div
              className={[
                'summary-card-main',
                'summary-card-main-stacked',
                marketStatus ===
                'Mercado fechado'
                  ? 'market-closed-summary'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {marketStatus ===
              'Mercado fechado' ? (
                <>
                  <strong className="market-closed-value">
                    Mercado fechado
                  </strong>

                  <div className="summary-card-context update-session-details">
                    <div className="update-session-row">
                      <span className="update-session-label">
                        Último dado:
                      </span>

                      <span className="update-session-inline-value">
                        {formatTime(
                          latestQuote.recordedAtUtc,
                        )}
                      </span>
                    </div>

                    <div className="update-session-row">
                      <span className="update-session-label">
                        Próxima sessão:
                      </span>

                      <span className="update-session-inline-value">
                        {nextRegularSessionLabel}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            <div className="summary-card-footer update-card-footer">
              <small>
                Sessão Nasdaq · 9:30–16:00 ET
              </small>
            </div>
          </article>
        </section>

        <section
          className={[
            'dashboard-content',
            expandedEventId
              ? 'has-expanded-event'
              : '',
            isImpactRankingCollapsed
              ? 'ranking-collapsed'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <article
            className="chart-panel"
            id="chart"
          >
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  {timeSeries?.symbol ??
                    dashboard.symbol}{' '}
                  ·{' '}
                  {timeSeries?.exchange ??
                    'NASDAQ'}
                </p>

                <h2>Desempenho no período</h2>
              </div>

            </div>

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
              {!timeSeries &&
                isChartLoading && (
                  <div className="chart-state-message">
                    Carregando período...
                  </div>
                )}

              {!timeSeries &&
                !isChartLoading &&
                chartError && (
                  <ApiErrorNotice
                    error={chartError}
                    onRetry={retryChartLoad}
                    className="chart-error-notice"
                  />
                )}

              {timeSeries && (
                <Suspense
                  fallback={
                    <StockChartLoadingFallback />
                  }
                >
                  <StockChart
                    values={
                      timeSeries.values
                    }
                    events={
                      occurredEvents
                    }
                    selectedEventId={
                      selectedEventId
                    }
                    eventImpactSummaries={
                      chartEventImpactSummaries
                    }
                    onEventSelect={
                      handleChartEventSelect
                    }
                  />
                </Suspense>
              )}

            </div>

            {timeSeries && chartError && (
              <ApiErrorNotice
                error={chartError}
                onRetry={retryChartLoad}
                compact
                staleMessage="O gráfico continua exibindo os últimos dados carregados com sucesso."
                className="chart-stale-notice"
              />
            )}

            <p className="chart-footnote">
              Dados referentes ao{' '}
              {chartError && timeSeries
                ? 'último período carregado'
                : 'período selecionado'}.
              Cotações em{' '}
              {timeSeries?.currency ?? 'USD'}.
            </p>
          </article>

          <aside
            className="events-panel"
            id="events"
          >
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">
                  Eventos de GTA VI
                </p>

                <h2>
                  Linha do tempo
                </h2>
              </div>

              <span
                className="events-count"
                title={
                  timelineMode === 'PERIOD'
                    ? `${timelineEvents.length} de ${occurredEvents.length} eventos estão no período exibido pelo gráfico.`
                    : `${occurredEvents.length} eventos cadastrados.`
                }
              >
                {timelineEvents.length}{' '}
                {timelineEvents.length === 1
                  ? 'evento'
                  : 'eventos'}
                {timelineMode === 'PERIOD'
                  ? ' no período'
                  : ''}
              </span>
            </div>

            <div
              className="timeline-mode-selector"
              role="group"
              aria-label="Eventos exibidos na linha do tempo"
            >
              <button
                className={
                  timelineMode === 'PERIOD'
                    ? 'active'
                    : ''
                }
                type="button"
                onClick={() =>
                  setTimelineMode('PERIOD')
                }
              >
                No período do gráfico
              </button>

              <button
                className={
                  timelineMode === 'ALL'
                    ? 'active'
                    : ''
                }
                type="button"
                onClick={() =>
                  setTimelineMode('ALL')
                }
              >
                Todos os eventos
              </button>
            </div>

            <div
              className="events-list"
              ref={eventsListRef}
              onPointerDown={cancelTimelineReturn}
              onWheel={cancelTimelineReturn}
            >
              {timelineEvents.length > 0 ? (
                timelineEventGroups.map(
                  (timelineGroup) => (
                    <section
                      className="event-date-group"
                      key={timelineGroup.dateKey}
                      aria-labelledby={`event-date-${timelineGroup.dateKey}`}
                    >
                      <div className="event-date-heading">
                        <time
                          id={`event-date-${timelineGroup.dateKey}`}
                          dateTime={timelineGroup.dateKey}
                        >
                          {timelineGroup.label}
                        </time>
                      </div>

                      <div className="event-date-items">
                        {timelineGroup.events.map(
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

                    const sourceLabel =
                      getGtaEventSourceLabel(
                        gtaEvent,
                      )

                    const previewImpact =
                      eventImpacts[gtaEvent.id] ??
                      impactRanking.find(
                        (impact) =>
                          impact.eventId ===
                          gtaEvent.id,
                      )

                    const previewImpactSummary =
                      getEventPreviewImpactSummary(
                        previewImpact,
                      )

                    const previewImpactTone =
                      previewImpactSummary
                        ? getEventPreviewImpactTone(
                            previewImpactSummary.value,
                          )
                        : null

                    const isPreviewImpactLoading =
                      loadingEventImpactIds.has(
                        gtaEvent.id,
                      ) && !previewImpactSummary

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
                            <EventIcon
                              iconKey={eventStyle.iconKey}
                              className="event-category-icon"
                            />
                          </div>

                          <div className="event-card-content">
                            <h3>
                              {gtaEvent.title}
                            </h3>

                            <div className="event-card-signals">
                              <span
                                className={`event-badge ${eventStyle.className}`}
                              >
                                {eventStyle.label}
                              </span>

                              {previewImpactSummary &&
                                previewImpactTone && (
                                  <span
                                    className={`event-impact-direction ${previewImpactTone}`}
                                    title={previewImpactSummary.label}
                                  >
                                    {getEventPreviewImpactLabel(
                                      previewImpactSummary.value,
                                    )}
                                    <strong>
                                      {formatImpactPercent(
                                        previewImpactSummary.value,
                                      )}
                                    </strong>
                                  </span>
                                )}
                            </div>
                          </div>

                          <span
                            className="event-expand-indicator"
                            aria-hidden="true"
                          >
                            <InterfaceIcon
                              name="chevron-right"
                              className="inline-action-icon"
                            />
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            className="event-card-details event-card-preview"
                            id={detailsId}
                          >
                            <p className="event-detail-section-label">
                              Resumo
                            </p>

                            <p className="event-detail-description event-preview-description">
                              {gtaEvent.summary?.trim() ||
                                gtaEvent.description}
                            </p>

                            {gtaEvent.isImpactAnalysisEligible ===
                            false ? (
                              <div className="event-preview-impact unavailable">
                                <span>Reação observada</span>
                                <strong>
                                  Sem análise de mercado
                                </strong>
                              </div>
                            ) : previewImpactSummary &&
                              previewImpactTone ? (
                              <div
                                className={`event-preview-impact ${previewImpactTone}`}
                              >
                                <span>Reação observada</span>
                                <strong>
                                  {getEventPreviewImpactLabel(
                                    previewImpactSummary.value,
                                  )}{' '}
                                  {formatImpactPercent(
                                    previewImpactSummary.value,
                                  )}
                                </strong>
                                <small>
                                  {previewImpactSummary.label}
                                </small>
                              </div>
                            ) : isPreviewImpactLoading ? (
                              <div className="event-preview-impact loading">
                                <span>Reação observada</span>
                                <strong>
                                  Calculando reação da TTWO…
                                </strong>
                              </div>
                            ) : (
                              <div className="event-preview-impact unavailable">
                                <span>Reação observada</span>
                                <strong>
                                  Ainda não disponível
                                </strong>
                              </div>
                            )}

                            <div className="event-preview-metadata">
                              <span>
                                <small>Categoria</small>
                                <strong>
                                  {categoryLabel}
                                </strong>
                              </span>

                              <span>
                                <small>Fonte</small>
                                <strong>
                                  {sourceLabel}
                                </strong>
                              </span>

                              <span>
                                <small>Data</small>
                                <strong>
                                  {formatTradingDate(
                                    gtaEvent.occurredAtUtc,
                                  )}
                                </strong>
                              </span>
                            </div>

                            <div className="event-preview-actions">
                              <button
                                className="event-analysis-cta"
                                type="button"
                                onClick={() =>
                                  openEventAnalysis(
                                    gtaEvent,
                                  )
                                }
                              >
                                Ver análise completa
                                <InterfaceIcon
                                  name="expand"
                                  className="inline-action-icon"
                                />
                              </button>

                              {gtaEvent.sourceUrl.trim() && (
                                <a
                                  className="event-preview-source-link"
                                  href={gtaEvent.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Fonte
                                  <InterfaceIcon
                                    name="external-link"
                                    className="inline-action-icon"
                                  />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  },
                )}
                      </div>
                    </section>
                  ),
                )
              ) : (
                <article className="empty-event-card">
                  <h3>
                    {timelineMode === 'PERIOD'
                      ? 'Nenhum evento neste período'
                      : 'Nenhum evento cadastrado'}
                  </h3>

                  <p>
                    {timelineMode === 'PERIOD'
                      ? 'Altere o período do gráfico ou selecione “Todos os eventos”.'
                      : 'Ainda não existem eventos relacionados ao GTA VI.'}
                  </p>
                </article>
              )}
            </div>

          </aside>

          <aside
            className={[
              'impact-ranking-panel',
              isImpactRankingCollapsed
                ? 'collapsed'
                : 'complete',
              !isImpactRankingCollapsed
                ? isImpactRankingOrder
                  ? 'impact-ordered'
                  : 'date-ordered'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            id="impact-ranking"
          >
            {isImpactRankingCollapsed ? (
              <button
                className="impact-ranking-expand-button"
                type="button"
                onClick={() =>
                  setIsImpactRankingCollapsed(false)
                }
                aria-label="Abrir ranking completo de impacto"
                title="Abrir ranking completo de impacto"
              >
                <InterfaceIcon
                  name="expand"
                  className="inline-action-icon"
                />
                <strong>Abrir ranking</strong>
              </button>
            ) : (
              <>
                <div className="panel-header impact-ranking-header">
                  <div>
                    <p className="panel-eyebrow">
                      Análise comparativa
                    </p>

                    <div className="impact-ranking-title-row">
                      <h2>
                        {isImpactRankingOrder
                          ? 'Ranking por reação da TTWO'
                          : 'Eventos analisados'}
                      </h2>

                      {isImpactRankingOrder && (
                        <span
                          className="impact-ranking-info"
                          tabIndex={0}
                          title="A posição considera o tamanho absoluto da variação, independentemente de alta ou queda."
                          aria-label="Como as posições do ranking são calculadas"
                        >
                          i
                        </span>
                      )}
                    </div>

                    <p className="impact-ranking-result-count">
                      <span className="impact-ranking-eligible-summary">
                        <strong>
                          {rankingEntries.length} eventos elegíveis
                        </strong>

                        <span>
                          de {occurredEvents.length} cadastrados para{' '}
                          {rankingPeriodLabel}
                        </span>
                      </span>

                      {unavailableRankingEventCount > 0 && (
                        <span
                          className="impact-ranking-unavailable-count"
                          tabIndex={0}
                          title="Um evento pode ficar fora do ranking quando não é elegível para análise, não possui pregões suficientes após a data ou não há cotações completas para o período selecionado."
                        >
                          {unavailableRankingEventCount}{' '}
                          {unavailableRankingEventCount === 1
                            ? 'evento sem dados suficientes'
                            : 'eventos sem dados suficientes'}
                        </span>
                      )}

                      {hasActiveRankingFilters && (
                        <span className="impact-ranking-filtered-count">
                          <strong>{rankedEvents.length}</strong>{' '}
                          {rankedEvents.length === 1
                            ? 'evento encontrado'
                            : 'eventos encontrados'}
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    className="impact-ranking-collapse-button"
                    type="button"
                    onClick={() =>
                      setIsImpactRankingCollapsed(true)
                    }
                    title="Recolher ranking"
                    aria-label="Recolher ranking"
                  >
                    <InterfaceIcon
                      name="collapse"
                      className="inline-action-icon"
                    />
                    Recolher
                  </button>
                </div>

                <div
                  className="impact-ranking-periods"
                  role="group"
                  aria-label="Quantidade de pregões usada no ranking"
                >
                  {impactRankingPeriodOptions.map(
                    (periodOption) => (
                      <button
                        key={periodOption.value}
                        className={
                          selectedRankingPeriod ===
                          periodOption.value
                            ? 'active'
                            : ''
                        }
                        type="button"
                        onClick={() =>
                          setSelectedRankingPeriod(
                            periodOption.value,
                          )
                        }
                      >
                        {periodOption.label}
                      </button>
                    ),
                  )}
                </div>

                <div
                  className="impact-ranking-direction"
                  role="group"
                  aria-label="Direção da variação"
                >
                  <button
                    className={
                      impactRankingDirection ===
                      'ALL'
                        ? 'active'
                        : ''
                    }
                    type="button"
                    onClick={() =>
                      setImpactRankingDirection(
                        'ALL',
                      )
                    }
                  >
                    Todos
                  </button>

                  <button
                    className={[
                      'positive',
                      impactRankingDirection ===
                      'UP'
                        ? 'active'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    type="button"
                    onClick={() =>
                      setImpactRankingDirection(
                        'UP',
                      )
                    }
                  >
                    Altas
                  </button>

                  <button
                    className={[
                      'negative',
                      impactRankingDirection ===
                      'DOWN'
                        ? 'active'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    type="button"
                    onClick={() =>
                      setImpactRankingDirection(
                        'DOWN',
                      )
                    }
                  >
                    Quedas
                  </button>
                </div>

                <div className="impact-ranking-filter-row">
                  <label className="impact-ranking-select">
                    <span>Categoria</span>
                    <select
                      value={impactRankingCategory}
                      onChange={(event) =>
                        setImpactRankingCategory(
                          event.target.value,
                        )
                      }
                    >
                      <option value="ALL">
                        Todas as categorias
                      </option>

                      {impactRankingCategories.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category} ({impactRankingCategoryCounts.get(
                              category,
                            ) ?? 0})
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="impact-ranking-select">
                    <span>Ordenar por</span>
                    <select
                      value={impactRankingSort}
                      onChange={(event) =>
                        setImpactRankingSort(
                          event.target
                            .value as ImpactRankingSort,
                        )
                      }
                    >
                      <option value="IMPACT_DESC">
                        Maior variação absoluta
                      </option>
                      <option value="IMPACT_ASC">
                        Menor variação absoluta
                      </option>
                      <option value="RECENT">
                        Mais recentes
                      </option>
                      <option value="OLDEST">
                        Mais antigos
                      </option>
                    </select>
                  </label>
                </div>

                <label className="impact-ranking-search">
                  <InterfaceIcon
                    name="search"
                    className="inline-action-icon"
                  />
                  <input
                    type="search"
                    value={impactRankingSearch}
                    onChange={(event) =>
                      setImpactRankingSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Buscar evento, categoria ou fonte"
                    aria-label="Buscar no ranking de impacto"
                  />
                </label>

                <div className="impact-ranking-list">
                  {isImpactRankingLoading &&
                    impactRanking.length === 0 && (
                      <div className="impact-ranking-state">
                        <span className="status-pulse" />
                        <p>Calculando ranking...</p>
                      </div>
                    )}

                  {impactRankingError && (
                    <ApiErrorNotice
                      error={impactRankingError}
                      onRetry={retryImpactRankingLoad}
                      compact
                      staleMessage={
                        impactRanking.length > 0
                          ? 'O ranking abaixo continua exibindo o último resultado carregado com sucesso.'
                          : undefined
                      }
                      className="ranking-error-notice"
                    />
                  )}

                  {isImpactRankingLoading &&
                    impactRanking.length > 0 && (
                      <div
                        className="impact-ranking-refreshing"
                        role="status"
                      >
                        <span className="status-pulse" />
                        Atualizando ranking...
                      </div>
                    )}

                  {!isImpactRankingLoading &&
                    !impactRankingError &&
                    rankedEvents.length === 0 && (
                      <div className="impact-ranking-state">
                        <p>
                          Nenhum evento corresponde aos filtros selecionados.
                        </p>
                      </div>
                    )}

                  {rankedEvents.map(
                      (
                        {
                          gtaEvent,
                          impactValue,
                          categoryLabel,
                        },
                        index,
                      ) => {
                        const eventStyle =
                          getGtaEventPresentation(
                            gtaEvent,
                          )

                        const isSelected =
                          selectedEventId ===
                          gtaEvent.id

                        return (
                          <button
                            className={[
                              'impact-ranking-item',
                              isSelected
                                ? 'selected'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            type="button"
                            key={gtaEvent.id}
                            onClick={() =>
                              openEventAnalysis(
                                gtaEvent,
                              )
                            }
                            aria-label={
                              `Ver análise completa de ${gtaEvent.title}. ${gtaEvent.description}`
                            }
                            aria-describedby={
                              `ranking-description-${gtaEvent.id}`
                            }
                            aria-pressed={isSelected}
                            title={
                              `${gtaEvent.title}\n\n${gtaEvent.description}`
                            }
                          >
                            {isImpactRankingOrder ? (
                              <span
                                className={`impact-ranking-position position-${index + 1}`}
                                title="A posição considera o tamanho absoluto da variação, independentemente de alta ou queda."
                              >
                                {index + 1}
                              </span>
                            ) : (
                              <span
                                className="impact-ranking-date-order"
                                title={formatGtaEventDate(
                                  gtaEvent.occurredAtUtc,
                                )}
                              >
                                {formatRankingOrderDate(
                                  gtaEvent.occurredAtUtc,
                                )}
                              </span>
                            )}

                            <span
                              className={`impact-ranking-icon ${eventStyle.className}`}
                              aria-hidden="true"
                            >
                              <EventIcon
                                iconKey={eventStyle.iconKey}
                                className="event-category-icon"
                              />
                            </span>

                            <span className="impact-ranking-copy">
                              <strong
                                title={gtaEvent.title}
                              >
                                {gtaEvent.title}
                              </strong>

                              <span className="impact-ranking-metadata">
                                <span className="impact-ranking-category">
                                  {categoryLabel}
                                </span>

                                <small>
                                  {formatGtaEventDate(
                                    gtaEvent.occurredAtUtc,
                                  )}
                                </small>
                              </span>

                              <span
                                className="visually-hidden"
                                id={`ranking-description-${gtaEvent.id}`}
                              >
                                {gtaEvent.description}
                              </span>
                            </span>

                            <strong
                              className={`impact-ranking-value ${getImpactValueClassName(
                                impactValue,
                              )}`}
                            >
                              {formatSignedPercent(
                                impactValue,
                              )}
                            </strong>
                          </button>
                        )
                      },
                    )}
                </div>

                <p className="impact-ranking-note">
                  <span
                    className="impact-ranking-note-icon"
                    aria-hidden="true"
                  >
                    i
                  </span>

                  <span>
                    {isImpactRankingOrder
                      ? `Ordenado pela maior variação absoluta da TTWO em ${rankingPeriodLabel}.`
                      : impactRankingSort === 'RECENT'
                        ? 'Ordenado do evento mais recente para o mais antigo.'
                        : 'Ordenado do evento mais antigo para o mais recente.'}

                    <strong>
                      Movimentos observados não comprovam causalidade.
                    </strong>
                  </span>
                </p>
              </>
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}

export default App
