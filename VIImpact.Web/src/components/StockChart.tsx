import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
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
  events: GtaEvent[]
  selectedEventId: string | null
  onEventSelect: (gtaEvent: GtaEvent) => void
}

interface ChartPoint {
  price: number
  volume: number
  timestamp: number
}

interface EligibleEvent {
  event: RichGtaEvent
  timestamp: number
  price: number
  dateKey: string
}

interface EventMarker {
  id: string
  event: RichGtaEvent
  presentation: GtaEventPresentation
  timestamp: number
  price: number
  labelSide: 'left' | 'right'
  horizontalOffset: number
  isSelected: boolean
}

interface EventTooltipState {
  marker: EventMarker
  x: number
  y: number
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

function calculateChartRangeInDays(
  points: ChartPoint[],
): number {
  if (points.length < 2) {
    return 0
  }

  const range =
    points[points.length - 1].timestamp -
    points[0].timestamp

  return range / (24 * 60 * 60 * 1000)
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

function createChartData(
  values: StockTimeSeriesPoint[],
): ChartPoint[] {
  return values
    .map((value) => ({
      price: value.close,
      volume: value.volume,
      timestamp: parseGtaEventDate(
        value.dateTimeUtc,
      ).getTime(),
    }))
    .filter((point) =>
      Number.isFinite(point.timestamp),
    )
    .sort(
      (firstPoint, secondPoint) =>
        firstPoint.timestamp -
        secondPoint.timestamp,
    )
}

function createAxisTicks(
  points: ChartPoint[],
  numberOfTicks = 7,
): number[] {
  if (points.length === 0) {
    return []
  }

  const minimumTimestamp =
    points[0].timestamp

  const maximumTimestamp =
    points[points.length - 1].timestamp

  if (
    minimumTimestamp === maximumTimestamp
  ) {
    return [minimumTimestamp]
  }

  const range =
    maximumTimestamp - minimumTimestamp

  return Array.from(
    {
      length: numberOfTicks,
    },
    (_, index) => {
      const position =
        index / (numberOfTicks - 1)

      return Math.round(
        minimumTimestamp +
          range * position,
      )
    },
  )
}

function createPriceDomain(
  points: ChartPoint[],
): [number, number] {
  if (points.length === 0) {
    return [0, 1]
  }

  const prices = points.map(
    (point) => point.price,
  )

  const minimumPrice = Math.min(...prices)
  const maximumPrice = Math.max(...prices)
  const priceRange =
    maximumPrice - minimumPrice

  const padding =
    priceRange > 0
      ? priceRange * 0.08
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

      const timestamp = eventDate.getTime()

      if (
        !Number.isFinite(timestamp) ||
        timestamp < minimumTimestamp ||
        timestamp > maximumTimestamp
      ) {
        return null
      }

      const nearestPointIndex =
        findNearestPointIndex(
          chartData,
          timestamp,
        )

      if (nearestPointIndex < 0) {
        return null
      }

      return {
        event: gtaEvent as RichGtaEvent,
        timestamp,
        price:
          chartData[nearestPointIndex].price,
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
): EventMarker[] {
  if (chartData.length === 0) {
    return []
  }

  const minimumTimestamp =
    chartData[0].timestamp

  const maximumTimestamp =
    chartData[chartData.length - 1].timestamp

  const groupsByDate =
    new Map<string, EligibleEvent[]>()

  createEligibleEvents(
    events,
    chartData,
  ).forEach((eligibleEvent) => {
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
          maximumTimestamp ===
          minimumTimestamp
            ? 0
            : (eligibleEvent.timestamp -
                minimumTimestamp) /
              (maximumTimestamp -
                minimumTimestamp)

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
          labelSide:
            chartPosition >= 0.7
              ? 'left'
              : 'right',
          horizontalOffset,
          isSelected,
        })
      },
    )
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

  const tooltipHeight = 236
  const verticalPosition = Math.max(
    8,
    Math.min(
      tooltip.y - tooltipHeight / 2,
      450 - tooltipHeight - 8,
    ),
  )

  return (
    <div
      className={`event-chart-popup ${marker.labelSide}`}
      role="tooltip"
      style={{
        left: tooltip.x,
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
          {marker.price.toLocaleString(
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

  const [isFocused, setIsFocused] =
    useState(false)

  const iconX =
    cx + marker.horizontalOffset

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

  function showTooltip() {
    onTooltipChange({
      marker,
      x: iconX,
      y: cy,
    })
  }

  function handleMouseEnter() {
    setIsHovered(true)
    showTooltip()
  }

  function handleMouseLeave() {
    setIsHovered(false)

    if (!isFocused) {
      onTooltipChange(null)
    }
  }

  function handleFocus() {
    setIsFocused(true)
    showTooltip()
  }

  function handleBlur() {
    setIsFocused(false)

    if (!isHovered) {
      onTooltipChange(null)
    }
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
    onSelect(marker.event)
  }

  return (
    <g
      role="button"
      aria-label={markerLabel}
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(
        event: { preventDefault: () => void },
      ) => event.preventDefault()
      }
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={() =>
        onSelect(marker.event)
      }
      onKeyDown={handleKeyDown}
      style={{
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {marker.horizontalOffset !== 0 && (
        <line
          x1={cx}
          y1={cy}
          x2={iconX}
          y2={cy}
          stroke={marker.presentation.color}
          strokeWidth="1.5"
          strokeOpacity="0.72"
          strokeDasharray="2 2"
          pointerEvents="none"
        />
      )}

      {marker.isSelected && (
        <rect
          x={iconX - iconSize / 2 - 5}
          y={cy - iconSize / 2 - 5}
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
        y={cy - iconSize / 2}
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
          y={cy}
        />
      </g>
    </g>
  )
}

export function StockChart({
  values,
  events,
  selectedEventId,
  onEventSelect,
}: StockChartProps) {
  const [
    activeEventTooltip,
    setActiveEventTooltip,
  ] = useState<EventTooltipState | null>(null)

  const chartData = createChartData(values)
  const chartRangeInDays =
    calculateChartRangeInDays(
      chartData,
    )

  const axisTicks = createAxisTicks(
    chartData,
    7,
  )

  const priceDomain =
    createPriceDomain(chartData)

  const eventMarkers =
    createEventMarkers(
      events,
      chartData,
      selectedEventId,
    )

  const selectedMarker =
    eventMarkers.find(
      (marker) => marker.isSelected,
    )

  const impactWindow =
    createImpactWindow(
      selectedMarker,
      chartData,
    )



  return (
    <div
      className="stock-chart-container"
      style={{
        width: '100%',
        height: 450,
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <AreaChart
          data={chartData}
          margin={{
            top: 34,
            right: 34,
            bottom: 26,
            left: 18,
          }}
        >
          <defs>
            <linearGradient
              id="stockPriceGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--accent-pink)"
                stopOpacity={0.42}
              />

              <stop
                offset="100%"
                stopColor="var(--accent-pink)"
                stopOpacity={0.03}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--border-color)"
            strokeDasharray="4 4"
            vertical={false}
          />

          {impactWindow && (
            <ReferenceArea
              x1={
                impactWindow.startTimestamp
              }
              x2={
                impactWindow.endTimestamp
              }
              fill="var(--accent-pink)"
              fillOpacity={0.07}
              stroke="var(--accent-pink)"
              strokeOpacity={0.2}
              ifOverflow="extendDomain"
            />
          )}

          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={[
              'dataMin',
              'dataMax',
            ]}
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
            width={76}
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

          <Tooltip
            labelFormatter={(timestamp: unknown) =>
              formatTooltipDate(
                Number(timestamp),
                chartRangeInDays,
              )
            }
            formatter={(value: unknown) => [
              `US$ ${Number(
                value,
              ).toFixed(2)}`,
              'Fechamento',
            ]}
            contentStyle={{
              color:
                'var(--primary-text)',
              background:
                'var(--panel-background)',
              border:
                '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow:
                'var(--card-shadow)',
            }}
            wrapperStyle={{
              visibility:
                activeEventTooltip
                  ? 'hidden'
                  : 'visible',
              pointerEvents: 'none',
            }}
          />

          {eventMarkers.map((marker) => (
            <ReferenceLine
              key={`event-line-${marker.id}`}
              segment={[
                {
                  x: marker.timestamp,
                  y: marker.price,
                },
                {
                  x: marker.timestamp,
                  y: priceDomain[0],
                },
              ]}
              stroke={
                marker.presentation.color
              }
              strokeDasharray={
                marker.isSelected
                  ? '4 3'
                  : '3 5'
              }
              strokeWidth={
                marker.isSelected ? 2.4 : 1.25
              }
              strokeOpacity={
                marker.isSelected ? 0.92 : 0.36
              }
              ifOverflow="visible"
            />
          ))}

          <Area
            type="monotone"
            dataKey="price"
            name="Fechamento"
            stroke="var(--accent-pink)"
            strokeWidth={3}
            fill="url(#stockPriceGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill:
                'var(--accent-pink)',
            }}
            isAnimationActive={false}
          />

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
        </AreaChart>
      </ResponsiveContainer>

      {activeEventTooltip && (
        <EventTooltipCard
          tooltip={activeEventTooltip}
        />
      )}
    </div>
  )
}