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

interface StockChartProps {
  values: StockTimeSeriesPoint[]
  events: GtaEvent[]
  selectedEventId: string | null
}

interface ChartPoint {
  price: number
  volume: number
  timestamp: number
}

interface EligibleEvent {
  event: GtaEvent
  timestamp: number
  price: number
  dateKey: string
}

interface EventMarker {
  id: string
  title: string
  occurredAtUtc: string
  category: string
  timestamp: number
  price: number
  labelSide: 'left' | 'right'
  horizontalOffset: number
  color: string
  isSelected: boolean
}

interface EventMarkerLabelProps {
  title: string
  side: 'left' | 'right'
  color: string
  viewBox?: {
    x?: number
    y?: number
  }
}

interface EventMarkerShapeProps {
  marker: EventMarker
  cx?: number
  cy?: number
}

interface ImpactWindow {
  startTimestamp: number
  endTimestamp: number
}

function normalizeDate(
  dateText: string,
): Date {
  const hasTimezone =
    dateText.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(dateText)

  return new Date(
    hasTimezone
      ? dateText
      : `${dateText}Z`,
  )
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

function formatEventDate(
  dateText: string,
): string {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'long',
      timeStyle: 'short',
    },
  ).format(normalizeDate(dateText))
}

function createChartData(
  values: StockTimeSeriesPoint[],
): ChartPoint[] {
  return values
    .map((value) => ({
      price: value.close,
      volume: value.volume,
      timestamp: normalizeDate(
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
    points[
      points.length - 1
    ].timestamp

  if (
    minimumTimestamp ===
    maximumTimestamp
  ) {
    return [minimumTimestamp]
  }

  const range =
    maximumTimestamp -
    minimumTimestamp

  return Array.from(
    {
      length: numberOfTicks,
    },
    (_, index) => {
      const position =
        index /
        (numberOfTicks - 1)

      return Math.round(
        minimumTimestamp +
          range * position,
      )
    },
  )
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

function calculateEventPrice(
  points: ChartPoint[],
  timestamp: number,
): number | null {
  const nearestPointIndex =
    findNearestPointIndex(
      points,
      timestamp,
    )

  if (nearestPointIndex < 0) {
    return null
  }

  return points[nearestPointIndex].price
}

function getEventCategory(
  gtaEvent: GtaEvent,
): string {
  const normalizedText =
    `${gtaEvent.title} ${gtaEvent.description}`
      .toLowerCase()

  if (
    normalizedText.includes('adiado') ||
    normalizedText.includes('adiamento')
  ) {
    return 'Adiamento'
  }

  if (normalizedText.includes('trailer')) {
    return 'Trailer'
  }

  if (
    normalizedText.includes('resultado') ||
    normalizedText.includes('financeiro')
  ) {
    return 'Resultados financeiros'
  }

  if (
    normalizedText.includes('pré-venda') ||
    normalizedText.includes('pre-venda')
  ) {
    return 'Pré-venda'
  }

  if (
    normalizedText.includes('lançamento') ||
    normalizedText.includes('lancamento')
  ) {
    return 'Lançamento'
  }

  if (
    normalizedText.includes('rumor') ||
    normalizedText.includes('vazamento') ||
    normalizedText.includes('leak')
  ) {
    return 'Rumor ou vazamento'
  }

  return 'Evento'
}

function getEventMarkerColor(
  category: string,
): string {
  switch (category) {
    case 'Adiamento':
      return 'var(--negative)'

    case 'Trailer':
      return 'var(--accent-purple)'

    case 'Resultados financeiros':
      return 'var(--accent-blue)'

    case 'Pré-venda':
      return '#f97316'

    case 'Lançamento':
      return 'var(--positive)'

    case 'Rumor ou vazamento':
      return 'var(--secondary-text)'

    default:
      return 'var(--accent-pink)'
  }
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
    chartData[
      chartData.length - 1
    ].timestamp

  return [...events]
    .sort(
      (firstEvent, secondEvent) =>
        normalizeDate(
          firstEvent.occurredAtUtc,
        ).getTime() -
        normalizeDate(
          secondEvent.occurredAtUtc,
        ).getTime(),
    )
    .map((gtaEvent) => {
      const eventDate = normalizeDate(
        gtaEvent.occurredAtUtc,
      )

      const timestamp =
        eventDate.getTime()

      if (
        !Number.isFinite(timestamp) ||
        timestamp < minimumTimestamp ||
        timestamp > maximumTimestamp
      ) {
        return null
      }

      const price =
        calculateEventPrice(
          chartData,
          timestamp,
        )

      if (price === null) {
        return null
      }

      return {
        event: gtaEvent,
        timestamp,
        price,
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
    chartData[
      chartData.length - 1
    ].timestamp

  const eligibleEvents =
    createEligibleEvents(
      events,
      chartData,
    )

  const groupsByDate =
    new Map<string, EligibleEvent[]>()

  eligibleEvents.forEach(
    (eligibleEvent) => {
      const currentGroup =
        groupsByDate.get(
          eligibleEvent.dateKey,
        ) ?? []

      currentGroup.push(eligibleEvent)

      groupsByDate.set(
        eligibleEvent.dateKey,
        currentGroup,
      )
    },
  )

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
              direction * distance * 14

            unselectedOffsetIndex += 1
          }
        } else {
          horizontalOffset =
            (index -
              (group.length - 1) / 2) *
            14
        }

        const chartPosition =
          maximumTimestamp ===
          minimumTimestamp
            ? 0
            : (eligibleEvent.timestamp -
                minimumTimestamp) /
              (maximumTimestamp -
                minimumTimestamp)

        const category =
          getEventCategory(
            eligibleEvent.event,
          )

        markers.push({
          id: eligibleEvent.event.id,
          title: eligibleEvent.event.title,
          occurredAtUtc:
            eligibleEvent.event.occurredAtUtc,
          category,
          timestamp:
            eligibleEvent.timestamp,
          price: eligibleEvent.price,
          labelSide:
            chartPosition >= 0.72
              ? 'left'
              : 'right',
          horizontalOffset,
          color:
            getEventMarkerColor(category),
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

function EventMarkerLabel({
  title,
  side,
  color,
  viewBox,
}: EventMarkerLabelProps) {
  const x = viewBox?.x ?? 0
  const y = 15

  const horizontalOffset =
    side === 'left' ? -10 : 10

  return (
    <text
      x={x + horizontalOffset}
      y={y}
      fill={color}
      fontSize={12}
      fontWeight={850}
      textAnchor={
        side === 'left'
          ? 'end'
          : 'start'
      }
      dominantBaseline="hanging"
      pointerEvents="none"
    >
      {title}
    </text>
  )
}

function EventMarkerShape({
  marker,
  cx = 0,
  cy = 0,
}: EventMarkerShapeProps) {
  const radius = marker.isSelected
    ? 9
    : 5.5

  const markerLabel = [
    marker.title,
    `Data: ${formatEventDate(
      marker.occurredAtUtc,
    )}`,
    `Categoria: ${marker.category}`,
  ].join('\n')

  return (
    <g
      transform={`translate(${marker.horizontalOffset} 0)`}
      role="img"
      aria-label={markerLabel}
      tabIndex={0}
      style={{
        cursor: 'help',
        outline: 'none',
      }}
    >
      <title>{markerLabel}</title>

      <circle
        cx={cx}
        cy={cy}
        r={radius + 3}
        fill="var(--panel-background)"
        opacity={
          marker.isSelected ? 1 : 0.88
        }
      />

      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={marker.color}
        stroke={
          marker.isSelected
            ? 'var(--primary-text)'
            : marker.color
        }
        strokeWidth={
          marker.isSelected ? 3 : 1.5
        }
        opacity={
          marker.isSelected ? 1 : 0.82
        }
      />
    </g>
  )
}

export function StockChart({
  values,
  events,
  selectedEventId,
}: StockChartProps) {
  const chartData =
    createChartData(values)

  const chartRangeInDays =
    calculateChartRangeInDays(
      chartData,
    )

  const axisTicks =
    createAxisTicks(
      chartData,
      7,
    )

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
            top: 82,
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
            tickFormatter={(
              timestamp,
            ) =>
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
            domain={['auto', 'auto']}
            width={76}
            tickMargin={10}
            tickFormatter={(price) =>
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
            labelFormatter={(
              timestamp,
            ) =>
              formatTooltipDate(
                Number(timestamp),
                chartRangeInDays,
              )
            }
            formatter={(value) => [
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
          />

          {selectedMarker && (
            <ReferenceLine
              x={selectedMarker.timestamp}
              stroke={selectedMarker.color}
              strokeDasharray="3 3"
              strokeWidth={3}
              strokeOpacity={1}
              label={
                <EventMarkerLabel
                  title={selectedMarker.title}
                  side={
                    selectedMarker.labelSide
                  }
                  color={
                    selectedMarker.color
                  }
                />
              }
            />
          )}

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

          {eventMarkers.map(
            (marker) => (
              <ReferenceDot
                key={`dot-${marker.id}`}
                x={marker.timestamp}
                y={marker.price}
                r={
                  marker.isSelected ? 9 : 6
                }
                fill={marker.color}
                stroke="transparent"
                ifOverflow="visible"
                shape={(
                  shapeProps: unknown,
                ) => {
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
                      cx={cx}
                      cy={cy}
                    />
                  )
                }}
              />
            ),
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}