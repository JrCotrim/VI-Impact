import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  GtaEvent,
  StockTimeSeriesPoint,
} from '../types/dashboard'
import {
  formatGtaEventDate,
  getGtaEventPresentation,
  getGtaEventPriorityLabel,
  getGtaEventSourceLabel,
  parseGtaEventDate,
  type GtaEventIconKey,
  type GtaEventPresentation,
  type RichGtaEvent,
} from '../utils/gtaEventPresentation'

interface StockChartProps {
  values: StockTimeSeriesPoint[]
  benchmarkValues?: StockTimeSeriesPoint[]
  primarySymbol?: string
  benchmarkSymbol?: string
  events: GtaEvent[]
  selectedEventId: string | null
  onEventSelect: (gtaEvent: GtaEvent) => void
}

interface ChartPoint {
  open: number
  high: number
  low: number
  close: number
  price: number
  primaryNormalized: number | null
  benchmarkClose: number | null
  benchmarkNormalized: number | null
  volume: number
  timestamp: number
}

interface EligibleEvent {
  event: RichGtaEvent
  timestamp: number
  price: number
  rawPrice: number
  dateKey: string
}

interface EventMarker {
  id: string
  event: RichGtaEvent
  presentation: GtaEventPresentation
  timestamp: number
  price: number
  rawPrice: number
  labelSide: 'left' | 'right'
  horizontalOffset: number
  lane: number
  isSelected: boolean
}

interface EventTooltipState {
  marker: EventMarker
  anchorClientX: number
  anchorClientY: number
}

interface EventMarkerShapeProps {
  marker: EventMarker
  onSelect: (gtaEvent: GtaEvent) => void
  onTooltipChange: (
    tooltip: EventTooltipState | null,
  ) => void
  cx?: number
  cy?: number
}

interface EventIconGlyphProps {
  iconKey: GtaEventIconKey
  x: number
  y: number
}

interface ImpactWindow {
  startTimestamp: number
  endTimestamp: number
}

interface ChartViewport {
  startIndex: number
  endIndex: number
}

const EVENT_MARKER_LANE_COUNT = 3
const EVENT_MARKER_LANE_GAP = 34
const EVENT_MARKER_RAIL_TOP = 24
const EVENT_MARKER_MIN_HORIZONTAL_GAP = 40
const EVENT_MARKER_CHART_TOP_MARGIN = 126

interface ChartDragState {
  pointerId: number
  startClientX: number
  viewport: ChartViewport
}

interface ChartSize {
  width: number
  height: number
}

interface StockPointTooltipProps {
  active?: boolean
  payload?: Array<{
    payload?: ChartPoint
  }>
  primarySymbol: string
  benchmarkSymbol: string
}

const minimumVisiblePointCount = 3
const maximumWheelDelta = 240
const wheelZoomIntensity = 0.0018

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(
    minimum,
    Math.min(value, maximum),
  )
}

function getMinimumViewportSpan(
  totalPointCount: number,
): number {
  return Math.max(
    0,
    Math.min(
      minimumVisiblePointCount,
      totalPointCount,
    ) - 1,
  )
}

function normalizeViewport(
  viewport: ChartViewport,
  totalPointCount: number,
): ChartViewport {
  if (totalPointCount <= 1) {
    return {
      startIndex: 0,
      endIndex: 0,
    }
  }

  const lastIndex = totalPointCount - 1
  const requestedSpan =
    viewport.endIndex - viewport.startIndex
  const span = clamp(
    Number.isFinite(requestedSpan)
      ? requestedSpan
      : lastIndex,
    getMinimumViewportSpan(totalPointCount),
    lastIndex,
  )
  const startIndex = clamp(
    Number.isFinite(viewport.startIndex)
      ? viewport.startIndex
      : 0,
    0,
    lastIndex - span,
  )

  return {
    startIndex,
    endIndex: startIndex + span,
  }
}

function areViewportsEqual(
  firstViewport: ChartViewport,
  secondViewport: ChartViewport,
): boolean {
  const tolerance = 0.0001

  return (
    Math.abs(
      firstViewport.startIndex -
        secondViewport.startIndex,
    ) < tolerance &&
    Math.abs(
      firstViewport.endIndex -
        secondViewport.endIndex,
    ) < tolerance
  )
}

function getViewportPointCount(
  viewport: ChartViewport,
): number {
  return viewport.endIndex - viewport.startIndex + 1
}

function createCenteredViewport(
  centerIndex: number,
  pointCount: number,
  totalPointCount: number,
): ChartViewport {
  if (totalPointCount <= 1) {
    return {
      startIndex: 0,
      endIndex: 0,
    }
  }

  const lastIndex = totalPointCount - 1
  const span = clamp(
    pointCount - 1,
    getMinimumViewportSpan(totalPointCount),
    lastIndex,
  )
  const startIndex = clamp(
    centerIndex - span / 2,
    0,
    lastIndex - span,
  )

  return {
    startIndex,
    endIndex: startIndex + span,
  }
}

function panViewport(
  viewport: ChartViewport,
  indexShift: number,
  totalPointCount: number,
): ChartViewport {
  const normalizedViewport = normalizeViewport(
    viewport,
    totalPointCount,
  )

  if (totalPointCount <= 1) {
    return normalizedViewport
  }

  const lastIndex = totalPointCount - 1
  const span =
    normalizedViewport.endIndex -
    normalizedViewport.startIndex
  const startIndex = clamp(
    normalizedViewport.startIndex + indexShift,
    0,
    lastIndex - span,
  )

  return {
    startIndex,
    endIndex: startIndex + span,
  }
}

function zoomViewport(
  viewport: ChartViewport,
  totalPointCount: number,
  wheelDelta: number,
  anchorRatio: number,
): ChartViewport {
  const normalizedViewport = normalizeViewport(
    viewport,
    totalPointCount,
  )

  if (totalPointCount <= 1) {
    return normalizedViewport
  }

  const lastIndex = totalPointCount - 1
  const currentSpan =
    normalizedViewport.endIndex -
    normalizedViewport.startIndex
  const normalizedWheelDelta = clamp(
    wheelDelta,
    -maximumWheelDelta,
    maximumWheelDelta,
  )
  const zoomFactor = Math.exp(
    normalizedWheelDelta * wheelZoomIntensity,
  )
  const targetSpan = clamp(
    currentSpan * zoomFactor,
    getMinimumViewportSpan(totalPointCount),
    lastIndex,
  )
  const normalizedAnchorRatio = clamp(
    anchorRatio,
    0,
    1,
  )
  const anchorIndex =
    normalizedViewport.startIndex +
    currentSpan * normalizedAnchorRatio
  const startIndex = clamp(
    anchorIndex -
      targetSpan * normalizedAnchorRatio,
    0,
    lastIndex - targetSpan,
  )

  return {
    startIndex,
    endIndex: startIndex + targetSpan,
  }
}

function getTimestampAtIndex(
  points: ChartPoint[],
  index: number,
): number {
  if (points.length === 0) {
    return 0
  }

  const normalizedIndex = clamp(
    index,
    0,
    points.length - 1,
  )
  const lowerIndex = Math.floor(normalizedIndex)
  const upperIndex = Math.ceil(normalizedIndex)

  if (lowerIndex === upperIndex) {
    return points[lowerIndex].timestamp
  }

  const ratio = normalizedIndex - lowerIndex

  return (
    points[lowerIndex].timestamp +
    (points[upperIndex].timestamp -
      points[lowerIndex].timestamp) *
      ratio
  )
}

function getViewportPoints(
  points: ChartPoint[],
  viewport: ChartViewport,
): ChartPoint[] {
  if (points.length === 0) {
    return []
  }

  const startIndex = Math.max(
    0,
    Math.floor(viewport.startIndex),
  )
  const endIndex = Math.min(
    points.length - 1,
    Math.ceil(viewport.endIndex),
  )

  return points.slice(startIndex, endIndex + 1)
}

function calculateChartRangeInDays(
  startTimestamp: number,
  endTimestamp: number,
): number {
  if (
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp)
  ) {
    return 0
  }

  return (
    Math.max(0, endTimestamp - startTimestamp) /
    (24 * 60 * 60 * 1000)
  )
}

function formatAxisDate(
  timestamp: number,
  rangeInDays: number,
): string {
  if (rangeInDays <= 2) {
    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(new Date(timestamp))
  }

  if (rangeInDays <= 45) {
    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        day: '2-digit',
        month: 'short',
      },
    ).format(new Date(timestamp))
  }

  if (rangeInDays <= 200) {
    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        month: 'short',
      },
    ).format(new Date(timestamp))
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      month: 'short',
      year: '2-digit',
    },
  ).format(new Date(timestamp))
}

function formatTooltipDate(
  timestamp: number,
  rangeInDays: number,
): string {
  const date = new Date(timestamp)

  if (rangeInDays <= 14) {
    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    ).format(date)
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'long',
    },
  ).format(date)
}

function formatCurrency(value: number): string {
  return `US$ ${value.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`
}

function shortenDescription(
  description: string,
): string {
  const maximumLength = 220
  const normalizedDescription =
    description.trim()

  if (
    normalizedDescription.length <=
    maximumLength
  ) {
    return normalizedDescription
  }

  return `${normalizedDescription.slice(
    0,
    maximumLength,
  )}…`
}

function createRawChartData(
  values: StockTimeSeriesPoint[],
): ChartPoint[] {
  return values
    .map((value) => ({
      open: value.open,
      high: value.high,
      low: value.low,
      close: value.close,
      price: value.close,
      primaryNormalized: null,
      benchmarkClose: null,
      benchmarkNormalized: null,
      volume: value.volume,
      timestamp: parseGtaEventDate(
        value.dateTimeUtc,
      ).getTime(),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.timestamp) &&
        Number.isFinite(point.open) &&
        Number.isFinite(point.high) &&
        Number.isFinite(point.low) &&
        Number.isFinite(point.close),
    )
    .sort(
      (firstPoint, secondPoint) =>
        firstPoint.timestamp -
        secondPoint.timestamp,
    )
}

function getMedianTimestampInterval(
  points: ChartPoint[],
): number {
  if (points.length < 2) {
    return 24 * 60 * 60 * 1000
  }

  const intervals = points
    .slice(1)
    .map(
      (point, index) =>
        point.timestamp -
        points[index].timestamp,
    )
    .filter(
      (interval) =>
        Number.isFinite(interval) &&
        interval > 0,
    )
    .sort(
      (firstInterval, secondInterval) =>
        firstInterval - secondInterval,
    )

  if (intervals.length === 0) {
    return 24 * 60 * 60 * 1000
  }

  return intervals[
    Math.floor(intervals.length / 2)
  ]
}

function getUtcDateKeyFromTimestamp(
  timestamp: number,
): string {
  return new Date(timestamp)
    .toISOString()
    .slice(0, 10)
}

function findNearestBenchmarkPoint(
  points: ChartPoint[],
  timestamp: number,
  maximumDistance: number,
): ChartPoint | null {
  if (points.length === 0) {
    return null
  }

  let lowerIndex = 0
  let upperIndex = points.length - 1

  while (lowerIndex <= upperIndex) {
    const middleIndex = Math.floor(
      (lowerIndex + upperIndex) / 2,
    )
    const middleTimestamp =
      points[middleIndex].timestamp

    if (middleTimestamp === timestamp) {
      return points[middleIndex]
    }

    if (middleTimestamp < timestamp) {
      lowerIndex = middleIndex + 1
    } else {
      upperIndex = middleIndex - 1
    }
  }

  const candidates = [
    points[upperIndex],
    points[lowerIndex],
  ].filter(
    (point): point is ChartPoint =>
      point !== undefined,
  )

  const nearestPoint = candidates.sort(
    (firstPoint, secondPoint) =>
      Math.abs(
        firstPoint.timestamp - timestamp,
      ) -
      Math.abs(
        secondPoint.timestamp - timestamp,
      ),
  )[0]

  if (
    !nearestPoint ||
    Math.abs(
      nearestPoint.timestamp - timestamp,
    ) > maximumDistance
  ) {
    return null
  }

  return nearestPoint
}

function createChartData(
  values: StockTimeSeriesPoint[],
  benchmarkValues: StockTimeSeriesPoint[],
): ChartPoint[] {
  const primaryPoints =
    createRawChartData(values)
  const benchmarkPoints =
    createRawChartData(benchmarkValues)

  if (
    primaryPoints.length === 0 ||
    benchmarkPoints.length === 0
  ) {
    return primaryPoints
  }

  const primaryBase = primaryPoints[0].close

  if (
    !Number.isFinite(primaryBase) ||
    primaryBase <= 0
  ) {
    return primaryPoints
  }

  const primaryInterval =
    getMedianTimestampInterval(primaryPoints)
  const benchmarkInterval =
    getMedianTimestampInterval(benchmarkPoints)
  const usesDailyDates =
    primaryInterval >= 12 * 60 * 60 * 1000

  const benchmarkPointsByDate = new Map(
    benchmarkPoints.map((point) => [
      getUtcDateKeyFromTimestamp(
        point.timestamp,
      ),
      point,
    ]),
  )

  const maximumIntradayDistance = Math.max(
    5 * 60 * 1000,
    primaryInterval * 0.75,
    benchmarkInterval * 0.75,
  )

  const matchedBenchmarkPoints =
    primaryPoints.map((primaryPoint) => {
      if (usesDailyDates) {
        return (
          benchmarkPointsByDate.get(
            getUtcDateKeyFromTimestamp(
              primaryPoint.timestamp,
            ),
          ) ?? null
        )
      }

      return findNearestBenchmarkPoint(
        benchmarkPoints,
        primaryPoint.timestamp,
        maximumIntradayDistance,
      )
    })

  const firstMatchedBenchmarkPoint =
    matchedBenchmarkPoints.find(
      (point): point is ChartPoint =>
        point !== null &&
        point.close > 0,
    )

  if (!firstMatchedBenchmarkPoint) {
    return primaryPoints
  }

  const benchmarkBase =
    firstMatchedBenchmarkPoint.close

  return primaryPoints.map(
    (primaryPoint, index) => {
      const benchmarkPoint =
        matchedBenchmarkPoints[index]
      const primaryNormalized =
        (primaryPoint.close / primaryBase) * 100
      const benchmarkNormalized =
        benchmarkPoint &&
        benchmarkPoint.close > 0
          ? (benchmarkPoint.close /
              benchmarkBase) *
            100
          : null

      return {
        ...primaryPoint,
        price: primaryNormalized,
        primaryNormalized,
        benchmarkClose:
          benchmarkPoint?.close ?? null,
        benchmarkNormalized,
      }
    },
  )
}


function createAxisTicks(
  points: ChartPoint[],
  startTimestamp: number,
  endTimestamp: number,
  numberOfTicks = 7,
): number[] {
  const visiblePoints = points.filter(
    (point) =>
      point.timestamp >= startTimestamp &&
      point.timestamp <= endTimestamp,
  )

  if (visiblePoints.length === 0) {
    return []
  }

  if (visiblePoints.length <= numberOfTicks) {
    return visiblePoints.map(
      (point) => point.timestamp,
    )
  }

  const tickIndexes = Array.from(
    { length: numberOfTicks },
    (_, index) =>
      Math.round(
        (index * (visiblePoints.length - 1)) /
          (numberOfTicks - 1),
      ),
  )

  return Array.from(
    new Set(
      tickIndexes.map(
        (index) =>
          visiblePoints[index].timestamp,
      ),
    ),
  )
}

function createPriceDomain(
  points: ChartPoint[],
): [number, number] {
  if (points.length === 0) {
    return [0, 1]
  }

  const prices = points.flatMap(
    (point) =>
      point.benchmarkNormalized === null
        ? [point.price]
        : [
            point.price,
            point.benchmarkNormalized,
          ],
  )
  const minimumPrice = Math.min(...prices)
  const maximumPrice = Math.max(...prices)
  const priceRange =
    maximumPrice - minimumPrice
  const padding =
    priceRange > 0
      ? priceRange * 0.1
      : Math.max(minimumPrice * 0.02, 1)

  return [
    Math.max(0, minimumPrice - padding),
    maximumPrice + padding,
  ]
}

function findNearestPointIndex(
  points: ChartPoint[],
  timestamp: number,
): number {
  if (points.length === 0) {
    return -1
  }

  let nearestIndex = 0
  let nearestDistance = Math.abs(
    points[0].timestamp - timestamp,
  )

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    const currentDistance = Math.abs(
      points[index].timestamp - timestamp,
    )

    if (currentDistance < nearestDistance) {
      nearestIndex = index
      nearestDistance = currentDistance
    }
  }

  return nearestIndex
}

function createEligibleEvents(
  events: GtaEvent[],
  chartData: ChartPoint[],
): EligibleEvent[] {
  if (chartData.length === 0) {
    return []
  }

  const minimumTimestamp =
    chartData[0].timestamp
  const maximumTimestamp =
    chartData[chartData.length - 1].timestamp

  return [...events]
    .sort(
      (firstEvent, secondEvent) =>
        parseGtaEventDate(
          firstEvent.occurredAtUtc,
        ).getTime() -
        parseGtaEventDate(
          secondEvent.occurredAtUtc,
        ).getTime(),
    )
    .map((gtaEvent) => {
      const eventDate = parseGtaEventDate(
        gtaEvent.occurredAtUtc,
      )
      const eventTimestamp =
        eventDate.getTime()

      if (
        !Number.isFinite(eventTimestamp) ||
        eventTimestamp < minimumTimestamp ||
        eventTimestamp > maximumTimestamp
      ) {
        return null
      }

      const nearestPointIndex =
        findNearestPointIndex(
          chartData,
          eventTimestamp,
        )

      if (nearestPointIndex < 0) {
        return null
      }

      return {
        event: gtaEvent as RichGtaEvent,
        timestamp:
          chartData[nearestPointIndex].timestamp,
        price:
          chartData[nearestPointIndex].price,
        rawPrice:
          chartData[nearestPointIndex].close,
        dateKey: eventDate
          .toISOString()
          .slice(0, 10),
      } satisfies EligibleEvent
    })
    .filter(
      (
        eligibleEvent,
      ): eligibleEvent is EligibleEvent =>
        eligibleEvent !== null,
    )
}

function createEventMarkers(
  events: GtaEvent[],
  chartData: ChartPoint[],
  selectedEventId: string | null,
  startTimestamp: number,
  endTimestamp: number,
  chartWidth: number,
): EventMarker[] {
  const groupsByDate =
    new Map<string, EligibleEvent[]>()

  createEligibleEvents(
    events,
    chartData,
  )
    .filter(
      (eligibleEvent) =>
        eligibleEvent.timestamp >=
          startTimestamp &&
        eligibleEvent.timestamp <=
          endTimestamp,
    )
    .forEach((eligibleEvent) => {
      const currentGroup =
        groupsByDate.get(
          eligibleEvent.dateKey,
        ) ?? []

      currentGroup.push(eligibleEvent)
      groupsByDate.set(
        eligibleEvent.dateKey,
        currentGroup,
      )
    })

  const markers: EventMarker[] = []
  const timestampRange = Math.max(
    endTimestamp - startTimestamp,
    1,
  )

  groupsByDate.forEach((group) => {
    const selectedEvent = group.find(
      (eligibleEvent) =>
        eligibleEvent.event.id ===
        selectedEventId,
    )

    let unselectedOffsetIndex = 0

    group.forEach(
      (eligibleEvent, index) => {
        const isSelected =
          eligibleEvent.event.id ===
          selectedEventId
        let horizontalOffset = 0

        if (selectedEvent) {
          if (!isSelected) {
            const distance =
              Math.floor(
                unselectedOffsetIndex / 2,
              ) + 1
            const direction =
              unselectedOffsetIndex % 2 === 0
                ? -1
                : 1

            horizontalOffset =
              direction * distance * 18
            unselectedOffsetIndex += 1
          }
        } else {
          horizontalOffset =
            (index -
              (group.length - 1) / 2) *
            18
        }

        const chartPosition =
          (eligibleEvent.timestamp -
            startTimestamp) /
          timestampRange

        markers.push({
          id: eligibleEvent.event.id,
          event: eligibleEvent.event,
          presentation:
            getGtaEventPresentation(
              eligibleEvent.event,
            ),
          timestamp:
            eligibleEvent.timestamp,
          price: eligibleEvent.price,
          rawPrice: eligibleEvent.rawPrice,
          labelSide:
            chartPosition >= 0.7
              ? 'left'
              : 'right',
          horizontalOffset,
          lane: 0,
          isSelected,
        })
      },
    )
  })

  const plotWidth = Math.max(
    chartWidth - 104,
    1,
  )
  const laneLastPositions = Array.from(
    { length: EVENT_MARKER_LANE_COUNT },
    () => Number.NEGATIVE_INFINITY,
  )

  ;[...markers]
    .sort(
      (firstMarker, secondMarker) =>
        firstMarker.timestamp -
          secondMarker.timestamp ||
        firstMarker.horizontalOffset -
          secondMarker.horizontalOffset,
    )
    .forEach((marker) => {
      const normalizedPosition =
        (marker.timestamp - startTimestamp) /
        timestampRange
      const xPosition =
        normalizedPosition * plotWidth +
        marker.horizontalOffset

      let availableLane =
        laneLastPositions.findIndex(
          (lastPosition) =>
            xPosition - lastPosition >=
            EVENT_MARKER_MIN_HORIZONTAL_GAP,
        )

      if (availableLane < 0) {
        availableLane =
          laneLastPositions.indexOf(
            Math.min(...laneLastPositions),
          )
      }

      marker.lane = availableLane
      laneLastPositions[availableLane] =
        xPosition
    })

  return markers
}

function createImpactWindow(
  selectedMarker: EventMarker | undefined,
  chartData: ChartPoint[],
): ImpactWindow | null {
  if (!selectedMarker) {
    return null
  }

  const selectedPointIndex =
    findNearestPointIndex(
      chartData,
      selectedMarker.timestamp,
    )

  if (selectedPointIndex < 0) {
    return null
  }

  const startIndex = Math.max(
    0,
    selectedPointIndex - 5,
  )
  const endIndex = Math.min(
    chartData.length - 1,
    selectedPointIndex + 5,
  )

  return {
    startTimestamp:
      chartData[startIndex].timestamp,
    endTimestamp:
      chartData[endIndex].timestamp,
  }
}

function formatNormalizedValue(
  value: number,
): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatNormalizedChange(
  value: number,
): string {
  const change = value - 100
  const formattedChange = Math.abs(
    change,
  ).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (change > 0) {
    return `+${formattedChange}%`
  }

  if (change < 0) {
    return `-${formattedChange}%`
  }

  return '0,00%'
}

function StockPointTooltip({
  active,
  payload,
  primarySymbol,
  benchmarkSymbol,
}: StockPointTooltipProps) {
  const point = payload?.[0]?.payload

  if (!active || !point) {
    return null
  }

  const primaryNormalized =
    point.primaryNormalized

  if (primaryNormalized !== null) {
    const primaryClassName =
      primaryNormalized >= 100
        ? 'positive-value'
        : 'negative-value'
    const benchmarkClassName =
      point.benchmarkNormalized === null
        ? ''
        : point.benchmarkNormalized >= 100
          ? 'positive-value'
          : 'negative-value'

    return (
      <div className="stock-point-tooltip stock-point-tooltip-compact">
        <strong className="stock-point-tooltip-date">
          {formatTooltipDate(
            point.timestamp,
            14,
          )}
        </strong>

        <div className="stock-point-tooltip-grid stock-point-tooltip-grid-compact">
          <span>{primarySymbol}</span>
          <strong className={primaryClassName}>
            {formatNormalizedValue(
              primaryNormalized,
            )}{' '}
            ·{' '}
            {formatNormalizedChange(
              primaryNormalized,
            )}
          </strong>

          <span>{benchmarkSymbol}</span>
          <strong className={benchmarkClassName}>
            {point.benchmarkNormalized === null
              ? 'Sem dado'
              : `${formatNormalizedValue(
                  point.benchmarkNormalized,
                )} · ${formatNormalizedChange(
                  point.benchmarkNormalized,
                )}`}
          </strong>

          <span>Preço de {primarySymbol}</span>
          <strong>
            {formatCurrency(point.close)}
          </strong>
        </div>
      </div>
    )
  }

  const priceChange = point.close - point.open
  const changeClassName =
    priceChange >= 0
      ? 'positive-value'
      : 'negative-value'

  return (
    <div className="stock-point-tooltip stock-point-tooltip-compact">
      <strong className="stock-point-tooltip-date">
        {formatTooltipDate(
          point.timestamp,
          14,
        )}
      </strong>

      <div className="stock-point-tooltip-grid stock-point-tooltip-grid-compact">
        <span>Fechamento</span>
        <strong className={changeClassName}>
          {formatCurrency(point.close)}
        </strong>

        <span>Volume</span>
        <strong>
          {point.volume.toLocaleString('pt-BR')}
        </strong>
      </div>
    </div>
  )
}


function EventIconGlyph({
  iconKey,
  x,
  y,
}: EventIconGlyphProps) {
  const centerX = x
  const centerY = y

  switch (iconKey) {
    case 'trailer':
      return (
        <path
          d={`M ${centerX - 4} ${centerY - 7} L ${centerX + 7} ${centerY} L ${centerX - 4} ${centerY + 7} Z`}
          fill="currentColor"
        />
      )

    case 'delay':
      return (
        <g
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        >
          <line
            x1={centerX}
            y1={centerY - 7}
            x2={centerX}
            y2={centerY + 2}
          />
          <circle
            cx={centerX}
            cy={centerY + 7}
            r="1.35"
            fill="currentColor"
            stroke="none"
          />
        </g>
      )

    case 'financial':
    case 'market-analysis':
      return (
        <g fill="currentColor">
          <rect
            x={centerX - 8}
            y={centerY + 1}
            width="3.5"
            height="7"
            rx="1"
          />
          <rect
            x={centerX - 1.75}
            y={centerY - 4}
            width="3.5"
            height="12"
            rx="1"
          />
          <rect
            x={centerX + 4.5}
            y={centerY - 8}
            width="3.5"
            height="16"
            rx="1"
          />
        </g>
      )

    case 'pre-order':
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={`M ${centerX - 7} ${centerY - 3} H ${centerX + 7} L ${centerX + 5} ${centerY + 8} H ${centerX - 5} Z`}
          />
          <path
            d={`M ${centerX - 4} ${centerY - 3} C ${centerX - 4} ${centerY - 9}, ${centerX + 4} ${centerY - 9}, ${centerX + 4} ${centerY - 3}`}
          />
        </g>
      )

    case 'pricing':
      return (
        <text
          x={centerX}
          y={centerY + 6}
          fill="currentColor"
          fontSize="18"
          fontWeight="900"
          textAnchor="middle"
        >
          $
        </text>
      )

    case 'distribution':
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        >
          <path
            d={`M ${centerX - 8} ${centerY - 5} L ${centerX} ${centerY - 9} L ${centerX + 8} ${centerY - 5} L ${centerX} ${centerY - 1} Z`}
          />
          <path
            d={`M ${centerX - 8} ${centerY - 5} V ${centerY + 5} L ${centerX} ${centerY + 9} L ${centerX + 8} ${centerY + 5} V ${centerY - 5}`}
          />
          <line
            x1={centerX}
            y1={centerY - 1}
            x2={centerX}
            y2={centerY + 9}
          />
        </g>
      )

    case 'launch':
      return (
        <path
          d={`M ${centerX} ${centerY - 9} L ${centerX + 2.7} ${centerY - 3} L ${centerX + 9} ${centerY - 2.3} L ${centerX + 4.2} ${centerY + 2} L ${centerX + 5.7} ${centerY + 8} L ${centerX} ${centerY + 4.8} L ${centerX - 5.7} ${centerY + 8} L ${centerX - 4.2} ${centerY + 2} L ${centerX - 9} ${centerY - 2.3} L ${centerX - 2.7} ${centerY - 3} Z`}
          fill="currentColor"
        />
      )

    case 'leak':
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <path
            d={`M ${centerX - 10} ${centerY} C ${centerX - 5} ${centerY - 7}, ${centerX + 5} ${centerY - 7}, ${centerX + 10} ${centerY} C ${centerX + 5} ${centerY + 7}, ${centerX - 5} ${centerY + 7}, ${centerX - 10} ${centerY} Z`}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r="3"
          />
        </g>
      )

    case 'security':
      return (
        <path
          d={`M ${centerX} ${centerY - 9} L ${centerX + 8} ${centerY - 5} V ${centerY + 1} C ${centerX + 8} ${centerY + 6}, ${centerX + 4} ${centerY + 9}, ${centerX} ${centerY + 11} C ${centerX - 4} ${centerY + 9}, ${centerX - 8} ${centerY + 6}, ${centerX - 8} ${centerY + 1} V ${centerY - 5} Z`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )

    case 'labor-legal':
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line
            x1={centerX}
            y1={centerY - 8}
            x2={centerX}
            y2={centerY + 8}
          />
          <line
            x1={centerX - 8}
            y1={centerY - 4}
            x2={centerX + 8}
            y2={centerY - 4}
          />
          <path
            d={`M ${centerX - 8} ${centerY - 4} L ${centerX - 12} ${centerY + 3} H ${centerX - 4} Z`}
          />
          <path
            d={`M ${centerX + 8} ${centerY - 4} L ${centerX + 4} ${centerY + 3} H ${centerX + 12} Z`}
          />
          <line
            x1={centerX - 5}
            y1={centerY + 9}
            x2={centerX + 5}
            y2={centerY + 9}
          />
        </g>
      )

    case 'development':
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={`M ${centerX - 3} ${centerY - 7} L ${centerX - 9} ${centerY} L ${centerX - 3} ${centerY + 7}`}
          />
          <path
            d={`M ${centerX + 3} ${centerY - 7} L ${centerX + 9} ${centerY} L ${centerX + 3} ${centerY + 7}`}
          />
        </g>
      )

    case 'corporate':
      return (
        <g fill="currentColor">
          <rect
            x={centerX - 8}
            y={centerY - 8}
            width="16"
            height="16"
            rx="2"
          />
          <rect
            x={centerX - 4.5}
            y={centerY - 4.5}
            width="3"
            height="3"
            fill="var(--panel-background)"
          />
          <rect
            x={centerX + 1.5}
            y={centerY - 4.5}
            width="3"
            height="3"
            fill="var(--panel-background)"
          />
          <rect
            x={centerX - 2}
            y={centerY + 1}
            width="4"
            height="7"
            fill="var(--panel-background)"
          />
        </g>
      )

    case 'release-window':
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect
            x={centerX - 9}
            y={centerY - 7}
            width="18"
            height="16"
            rx="2"
          />
          <line
            x1={centerX - 9}
            y1={centerY - 2}
            x2={centerX + 9}
            y2={centerY - 2}
          />
          <line
            x1={centerX - 5}
            y1={centerY - 10}
            x2={centerX - 5}
            y2={centerY - 4}
          />
          <line
            x1={centerX + 5}
            y1={centerY - 10}
            x2={centerX + 5}
            y2={centerY - 4}
          />
        </g>
      )

    case 'game-information':
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle
            cx={centerX}
            cy={centerY}
            r="9"
          />
          <line
            x1={centerX}
            y1={centerY - 1}
            x2={centerX}
            y2={centerY + 6}
          />
          <circle
            cx={centerX}
            cy={centerY - 5}
            r="1.2"
            fill="currentColor"
            stroke="none"
          />
        </g>
      )

    default:
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={`M ${centerX - 9} ${centerY - 4} L ${centerX + 3} ${centerY - 8} V ${centerY + 8} L ${centerX - 9} ${centerY + 4} Z`}
          />
          <line
            x1={centerX - 9}
            y1={centerY + 4}
            x2={centerX - 6}
            y2={centerY + 10}
          />
        </g>
      )
  }
}

function EventTooltipCard({
  tooltip,
}: {
  tooltip: EventTooltipState
}) {
  const { marker } = tooltip
  const priorityLabel =
    getGtaEventPriorityLabel(marker.event)
  const sourceLabel =
    getGtaEventSourceLabel(marker.event)

  const popupWidth = 318
  const popupHeight = 236
  const popupGap = 18
  const viewportPadding = 12
  const viewportWidth =
    typeof window === 'undefined'
      ? 1280
      : window.innerWidth
  const viewportHeight =
    typeof window === 'undefined'
      ? 720
      : window.innerHeight

  const hasRoomOnRight =
    tooltip.anchorClientX +
      popupGap +
      popupWidth +
      viewportPadding <=
    viewportWidth

  const horizontalPosition = hasRoomOnRight
    ? tooltip.anchorClientX + popupGap
    : tooltip.anchorClientX -
      popupWidth -
      popupGap

  const verticalPosition = Math.max(
    viewportPadding,
    Math.min(
      tooltip.anchorClientY -
        popupHeight / 2,
      viewportHeight -
        popupHeight -
        viewportPadding,
    ),
  )

  const popup = (
    <div
      className="event-chart-popup event-chart-popup-portal"
      role="tooltip"
      style={{
        left: Math.max(
          viewportPadding,
          Math.min(
            horizontalPosition,
            viewportWidth -
              popupWidth -
              viewportPadding,
          ),
        ),
        top: verticalPosition,
        borderColor: marker.presentation.color,
      }}
    >
      <div className="event-marker-tooltip-heading">
        <span
          className="event-marker-tooltip-icon"
          style={{
            background: marker.presentation.color,
          }}
          aria-hidden="true"
        >
          {marker.presentation.symbol}
        </span>

        <div>
          <span
            className="event-marker-tooltip-category"
            style={{
              color: marker.presentation.color,
            }}
          >
            {marker.presentation.label}
          </span>

          <strong>{marker.event.title}</strong>
        </div>
      </div>

      <p className="event-marker-tooltip-date">
        {formatGtaEventDate(
          marker.event.occurredAtUtc,
        )}
      </p>

      <div className="event-marker-tooltip-market">
        <span>Fechamento mais próximo</span>

        <strong>
          US${' '}
          {marker.rawPrice.toLocaleString(
            'pt-BR',
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}
        </strong>
      </div>

      <p className="event-marker-tooltip-description">
        {shortenDescription(
          marker.event.description,
        )}
      </p>

      <div className="event-marker-tooltip-footer">
        <span>{sourceLabel}</span>
        {priorityLabel && (
          <span>{priorityLabel}</span>
        )}
      </div>
    </div>
  )

  return createPortal(
    popup,
    document.body,
  )
}

function EventMarkerShape({
  marker,
  onSelect,
  onTooltipChange,
  cx = 0,
  cy = 0,
}: EventMarkerShapeProps) {
  const [isHovered, setIsHovered] =
    useState(false)

  const iconX =
    cx + marker.horizontalOffset
  const iconY =
    EVENT_MARKER_RAIL_TOP +
    marker.lane * EVENT_MARKER_LANE_GAP

  const iconSize = marker.isSelected
    ? 32
    : 27

  const markerLabel = [
    marker.event.title,
    `Data: ${formatGtaEventDate(
      marker.event.occurredAtUtc,
    )}`,
    `Categoria: ${marker.presentation.label}`,
  ].join('\n')

  function handleMouseEnter(
    event: ReactMouseEvent<SVGGElement>,
  ) {
    setIsHovered(true)
    onTooltipChange({
      marker,
      anchorClientX: event.clientX,
      anchorClientY: event.clientY,
    })
  }

  function handleMouseLeave() {
    setIsHovered(false)
    onTooltipChange(null)
  }

  function handleKeyDown(
    event: ReactKeyboardEvent<SVGGElement>,
  ) {
    if (
      event.key !== 'Enter' &&
      event.key !== ' '
    ) {
      return
    }

    event.preventDefault()
    onTooltipChange(null)
    onSelect(marker.event)
  }

  return (
    <g
      data-event-marker="true"
      role="button"
      aria-label={markerLabel}
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(
        event: { preventDefault: () => void },
      ) => event.preventDefault()
      }
      onClick={(event) => {
        onTooltipChange(null)
        event.currentTarget.blur()
        onSelect(marker.event)
      }}
      onKeyDown={handleKeyDown}
      style={{
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <line
        x1={iconX}
        y1={iconY + iconSize / 2}
        x2={iconX}
        y2={cy}
        stroke={marker.presentation.color}
        strokeWidth={
          marker.isSelected ? 1.8 : 1.15
        }
        strokeOpacity={
          marker.isSelected ? 0.78 : 0.34
        }
        strokeDasharray="3 4"
        pointerEvents="none"
      />

      {marker.horizontalOffset !== 0 && (
        <line
          x1={iconX}
          y1={cy}
          x2={cx}
          y2={cy}
          stroke={marker.presentation.color}
          strokeWidth="1.15"
          strokeOpacity="0.42"
          strokeDasharray="3 4"
          pointerEvents="none"
        />
      )}

      <circle
        cx={cx}
        cy={cy}
        r={marker.isSelected ? 4.5 : 3}
        fill={marker.presentation.color}
        stroke="var(--panel-background)"
        strokeWidth={marker.isSelected ? 2.2 : 1.5}
        pointerEvents="none"
      />

      {marker.isSelected && (
        <rect
          x={iconX - iconSize / 2 - 5}
          y={iconY - iconSize / 2 - 5}
          width={iconSize + 10}
          height={iconSize + 10}
          rx="12"
          fill={marker.presentation.color}
          opacity="0.17"
          pointerEvents="none"
        />
      )}

      <rect
        x={iconX - iconSize / 2}
        y={iconY - iconSize / 2}
        width={iconSize}
        height={iconSize}
        rx={marker.isSelected ? 10 : 8}
        fill={marker.presentation.color}
        stroke="var(--panel-background)"
        strokeWidth={marker.isSelected ? 3 : 2}
        opacity={
          marker.isSelected || isHovered
            ? 1
            : 0.9
        }
      />

      <g
        color="#ffffff"
        pointerEvents="none"
      >
        <EventIconGlyph
          iconKey={
            marker.presentation.iconKey
          }
          x={iconX}
          y={iconY}
        />
      </g>
    </g>
  )
}

export function StockChart({
  values,
  benchmarkValues = [],
  primarySymbol = 'TTWO',
  benchmarkSymbol = 'QQQ',
  events,
  selectedEventId,
  onEventSelect,
}: StockChartProps) {
  const chartContainerRef =
    useRef<HTMLDivElement | null>(null)
  const dragStateRef =
    useRef<ChartDragState | null>(null)
  const viewportRef =
    useRef<ChartViewport>({
      startIndex: 0,
      endIndex: Number.MAX_SAFE_INTEGER,
    })
  const pendingViewportRef =
    useRef<ChartViewport | null>(null)
  const animationFrameRef =
    useRef<number | null>(null)

  const [
    activeEventTooltip,
    setActiveEventTooltip,
  ] = useState<EventTooltipState | null>(null)
  const [isDragging, setIsDragging] =
    useState(false)
  const [viewport, setViewport] =
    useState<ChartViewport>({
      startIndex: 0,
      endIndex: Number.MAX_SAFE_INTEGER,
    })
  const [chartSize, setChartSize] =
    useState<ChartSize>({
      width: 0,
      height: 0,
    })

  const chartData = useMemo(
    () =>
      createChartData(
        values,
        benchmarkValues,
      ),
    [benchmarkValues, values],
  )
  const isComparisonMode =
    chartData.some(
      (point) =>
        point.benchmarkNormalized !== null,
    )
  const totalPointCount = chartData.length
  const normalizedViewport = useMemo(
    () =>
      normalizeViewport(
        viewport,
        totalPointCount,
      ),
    [viewport, totalPointCount],
  )
  const visiblePointCount =
    totalPointCount > 0
      ? getViewportPointCount(
          normalizedViewport,
        )
      : 0
  const isZoomed =
    visiblePointCount > 0 &&
    visiblePointCount < totalPointCount - 0.001
  const startTimestamp =
    getTimestampAtIndex(
      chartData,
      normalizedViewport.startIndex,
    )
  const endTimestamp =
    getTimestampAtIndex(
      chartData,
      normalizedViewport.endIndex,
    )
  const viewportPoints = useMemo(
    () =>
      getViewportPoints(
        chartData,
        normalizedViewport,
      ),
    [chartData, normalizedViewport],
  )

  useEffect(() => {
    viewportRef.current = normalizedViewport
  }, [normalizedViewport])

  useEffect(() => {
    const chartContainer =
      chartContainerRef.current

    if (!chartContainer) {
      return
    }

    let animationFrameId: number | null = null

    const measureChart = () => {
      const bounds =
        chartContainer.getBoundingClientRect()
      const parentBounds =
        chartContainer.parentElement
          ?.getBoundingClientRect()

      const measuredWidth = Math.max(
        1,
        Math.floor(bounds.width),
      )
      const measuredHeight = Math.max(
        240,
        Math.floor(
          bounds.height > 40
            ? bounds.height
            : parentBounds?.height ?? 0,
        ),
      )

      setChartSize((currentSize) => {
        if (
          currentSize.width === measuredWidth &&
          currentSize.height === measuredHeight
        ) {
          return currentSize
        }

        return {
          width: measuredWidth,
          height: measuredHeight,
        }
      })
    }

    const scheduleMeasurement = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(
          animationFrameId,
        )
      }

      animationFrameId =
        window.requestAnimationFrame(() => {
          animationFrameId = null
          measureChart()
        })
    }

    const resizeObserver =
      new ResizeObserver(scheduleMeasurement)

    resizeObserver.observe(chartContainer)
    scheduleMeasurement()

    return () => {
      resizeObserver.disconnect()

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(
          animationFrameId,
        )
      }
    }
  }, [])

  const scheduleViewportUpdate = useCallback(
    (nextViewport: ChartViewport) => {
      const normalizedNextViewport =
        normalizeViewport(
          nextViewport,
          totalPointCount,
        )

      pendingViewportRef.current =
        normalizedNextViewport

      if (animationFrameRef.current !== null) {
        return
      }

      animationFrameRef.current =
        window.requestAnimationFrame(() => {
          const pendingViewport =
            pendingViewportRef.current

          animationFrameRef.current = null
          pendingViewportRef.current = null

          if (!pendingViewport) {
            return
          }

          viewportRef.current = pendingViewport
          setViewport((currentViewport) =>
            areViewportsEqual(
              currentViewport,
              pendingViewport,
            )
              ? currentViewport
              : pendingViewport,
          )
        })
    },
    [totalPointCount],
  )

  useEffect(() => {
    const animationFrameId =
      window.requestAnimationFrame(() => {
        const completeViewport = {
          startIndex: 0,
          endIndex: Math.max(
            chartData.length - 1,
            0,
          ),
        }

        viewportRef.current = completeViewport
        pendingViewportRef.current = null
        setViewport(completeViewport)
        setActiveEventTooltip(null)
        setIsDragging(false)
        dragStateRef.current = null
      })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [chartData])

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          animationFrameRef.current,
        )
      }
    },
    [],
  )

  useEffect(() => {
    if (
      !selectedEventId ||
      chartData.length === 0
    ) {
      return
    }

    const selectedEvent = events.find(
      (gtaEvent) =>
        gtaEvent.id === selectedEventId,
    )

    if (!selectedEvent) {
      return
    }

    const selectedTimestamp =
      parseGtaEventDate(
        selectedEvent.occurredAtUtc,
      ).getTime()
    const selectedPointIndex =
      findNearestPointIndex(
        chartData,
        selectedTimestamp,
      )

    if (selectedPointIndex < 0) {
      return
    }

    const currentViewport =
      pendingViewportRef.current ??
      viewportRef.current
    const currentNormalizedViewport =
      normalizeViewport(
        currentViewport,
        chartData.length,
      )

    if (
      selectedPointIndex >=
        currentNormalizedViewport.startIndex &&
      selectedPointIndex <=
        currentNormalizedViewport.endIndex
    ) {
      return
    }

    scheduleViewportUpdate(
      createCenteredViewport(
        selectedPointIndex,
        getViewportPointCount(
          currentNormalizedViewport,
        ),
        chartData.length,
      ),
    )
  }, [
    chartData,
    events,
    scheduleViewportUpdate,
    selectedEventId,
  ])

  const chartRangeInDays =
    calculateChartRangeInDays(
      startTimestamp,
      endTimestamp,
    )
  const axisTicks = createAxisTicks(
    viewportPoints,
    startTimestamp,
    endTimestamp,
    7,
  )
  const priceDomain = createPriceDomain(
    viewportPoints,
  )
  const eventMarkers = createEventMarkers(
    events,
    chartData,
    selectedEventId,
    startTimestamp,
    endTimestamp,
    chartSize.width,
  )
  const chartTopMargin =
    eventMarkers.length > 0
      ? EVENT_MARKER_CHART_TOP_MARGIN
      : 30
  const selectedMarker = eventMarkers.find(
    (marker) => marker.isSelected,
  )
  const impactWindow = createImpactWindow(
    selectedMarker,
    chartData,
  )

  useEffect(() => {
    const chartContainer =
      chartContainerRef.current

    if (!chartContainer) {
      return
    }

    const chartElement: HTMLDivElement =
      chartContainer

    function handleNativeWheel(
      event: WheelEvent,
    ) {
      if (totalPointCount <= 1) {
        return
      }

      event.preventDefault()
      setActiveEventTooltip(null)

      const containerBounds =
        chartElement.getBoundingClientRect()
      const anchorRatio =
        containerBounds.width > 0
          ? (event.clientX -
              containerBounds.left) /
            containerBounds.width
          : 0.5
      const currentViewport =
        pendingViewportRef.current ??
        viewportRef.current

      scheduleViewportUpdate(
        zoomViewport(
          currentViewport,
          totalPointCount,
          event.deltaY,
          anchorRatio,
        ),
      )
    }

    chartElement.addEventListener(
      'wheel',
      handleNativeWheel,
      { passive: false },
    )

    return () => {
      chartElement.removeEventListener(
        'wheel',
        handleNativeWheel,
      )
    }
  }, [
    scheduleViewportUpdate,
    totalPointCount,
  ])

  function clearChartInteractionState() {
    setActiveEventTooltip(null)
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (!isZoomed || event.button !== 0) {
      return
    }

    const target = event.target

    if (
      target instanceof Element &&
      target.closest(
        '[data-event-marker="true"]',
      )
    ) {
      return
    }

    clearChartInteractionState()
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      viewport:
        pendingViewportRef.current ??
        viewportRef.current,
    }
    event.currentTarget.setPointerCapture(
      event.pointerId,
    )
    setIsDragging(true)
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const dragState = dragStateRef.current

    if (
      !dragState ||
      dragState.pointerId !== event.pointerId
    ) {
      return
    }

    const containerWidth =
      chartContainerRef.current
        ?.getBoundingClientRect().width ?? 0

    if (containerWidth <= 0) {
      return
    }

    event.preventDefault()

    const viewportSpan =
      dragState.viewport.endIndex -
      dragState.viewport.startIndex
    const horizontalMovement =
      event.clientX - dragState.startClientX
    const indexShift =
      (-horizontalMovement / containerWidth) *
      viewportSpan

    scheduleViewportUpdate(
      panViewport(
        dragState.viewport,
        indexShift,
        totalPointCount,
      ),
    )
  }

  function finishDragging(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const dragState = dragStateRef.current

    if (
      !dragState ||
      dragState.pointerId !== event.pointerId
    ) {
      return
    }

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      )
    }

    dragStateRef.current = null
    setIsDragging(false)
  }

  function handleKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (
      !isZoomed ||
      (event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight')
    ) {
      return
    }

    event.preventDefault()

    const currentViewport =
      pendingViewportRef.current ??
      viewportRef.current
    const viewportSpan =
      currentViewport.endIndex -
      currentViewport.startIndex
    const direction =
      event.key === 'ArrowLeft' ? -1 : 1

    scheduleViewportUpdate(
      panViewport(
        currentViewport,
        direction *
          Math.max(viewportSpan * 0.08, 1),
        totalPointCount,
      ),
    )
  }

  return (
    <div
      ref={chartContainerRef}
      className={`stock-chart-container trading-chart-container${
        isZoomed ? ' zoomed' : ''
      }${isDragging ? ' dragging' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
      }}
      tabIndex={0}
      aria-label={
        isComparisonMode
          ? `Gráfico comparativo normalizado de ${primarySymbol} e ${benchmarkSymbol}. Use o scroll para aproximar ou afastar e arraste para navegar pelas datas.`
          : 'Gráfico de linha interativo. Use o scroll para aproximar ou afastar e arraste para navegar pelas datas.'
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDragging}
      onPointerCancel={finishDragging}
      onKeyDown={handleKeyDown}
    >
      {chartSize.width > 0 &&
      chartSize.height > 0 ? (
        <LineChart
          width={chartSize.width}
          height={chartSize.height}
          data={viewportPoints}
          margin={{
            top: chartTopMargin,
            right: 14,
            bottom: 26,
            left: 12,
          }}
        >
          <CartesianGrid
            stroke="var(--border-color)"
            strokeDasharray="2 4"
            strokeOpacity={0.72}
            vertical
            horizontal
          />

          {impactWindow && (
            <ReferenceArea
              x1={impactWindow.startTimestamp}
              x2={impactWindow.endTimestamp}
              fill="var(--accent-pink)"
              fillOpacity={0.06}
              stroke="var(--accent-pink)"
              strokeOpacity={0.18}
              ifOverflow="hidden"
            />
          )}

          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={[
              startTimestamp,
              endTimestamp,
            ]}
            allowDataOverflow
            ticks={axisTicks}
            interval={0}
            tickFormatter={(timestamp: unknown) =>
              formatAxisDate(
                Number(timestamp),
                chartRangeInDays,
              )
            }
            tick={{
              fill:
                'var(--secondary-text)',
              fontSize: 12,
              fontWeight: 600,
            }}
            axisLine={{
              stroke:
                'var(--border-color)',
            }}
            tickLine={false}
            tickMargin={14}
          />

          <YAxis
            dataKey="price"
            domain={priceDomain}
            orientation="right"
            width={78}
            tickMargin={10}
            tickFormatter={(price: unknown) =>
              Number(price).toFixed(2)
            }
            tick={{
              fill:
                'var(--secondary-text)',
              fontSize: 12,
            }}
            axisLine={false}
            tickLine={false}
          />

          {!activeEventTooltip && (
            <Tooltip
              content={
                <StockPointTooltip
                  primarySymbol={primarySymbol}
                  benchmarkSymbol={benchmarkSymbol}
                />
              }
              cursor={{
                stroke:
                  'var(--secondary-text)',
                strokeDasharray: '3 3',
                strokeOpacity: 0.55,
                strokeWidth: 1,
              }}
              wrapperStyle={{
                visibility:
                  activeEventTooltip || isDragging
                    ? 'hidden'
                    : 'visible',
                pointerEvents: 'none',
                zIndex: 30,
              }}
            />
          )}

          <Line
            type="linear"
            dataKey="price"
            name={
              isComparisonMode
                ? primarySymbol
                : 'Fechamento'
            }
            stroke="var(--accent-pink)"
            strokeWidth={2.4}
            dot={false}
            activeDot={{
              r: 4,
              fill:
                'var(--accent-pink)',
              stroke:
                'var(--panel-background)',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />

          {isComparisonMode && (
            <Line
              type="linear"
              dataKey="benchmarkNormalized"
              name={benchmarkSymbol}
              stroke="var(--accent-blue)"
              strokeWidth={2.1}
              strokeDasharray="7 4"
              dot={false}
              activeDot={{
                r: 4,
                fill:
                  'var(--accent-blue)',
                stroke:
                  'var(--panel-background)',
                strokeWidth: 2,
              }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          {eventMarkers.map((marker) => (
            <ReferenceDot
              key={`event-marker-${marker.id}`}
              x={marker.timestamp}
              y={marker.price}
              r={16}
              fill="transparent"
              stroke="transparent"
              ifOverflow="visible"
              shape={(shapeProps: unknown) => {
                const {
                  cx,
                  cy,
                } = shapeProps as {
                  cx?: number
                  cy?: number
                }

                return (
                  <EventMarkerShape
                    marker={marker}
                    onSelect={onEventSelect}
                    onTooltipChange={
                      setActiveEventTooltip
                    }
                    cx={cx}
                    cy={cy}
                  />
                )
              }}
            />
          ))}
        </LineChart>
      ) : (
        <div className="chart-render-state">
          Preparando gráfico...
        </div>
      )}

      {activeEventTooltip && (
        <EventTooltipCard
          tooltip={activeEventTooltip}
        />
      )}
    </div>
  )
}