import {
  Area,
  AreaChart,
  CartesianGrid,
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
}

interface ChartPoint {
  price: number
  volume: number
  timestamp: number
}

interface EventMarker {
  id: string
  label: string
  timestamp: number
  price: number
  labelSide: 'left' | 'right'
}

interface EventMarkerLabelProps {
  label: string
  side: 'left' | 'right'
  viewBox?: {
    x?: number
    y?: number
  }
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

function shortenTitle(
  title: string,
): string {
  const maximumLength = 22

  if (title.length <= maximumLength) {
    return title
  }

  return `${title.slice(
    0,
    maximumLength,
  )}...`
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

function calculateEventPrice(
  points: ChartPoint[],
  timestamp: number,
): number | null {
  if (points.length === 0) {
    return null
  }

  const nearestPoint = points.reduce(
    (
      currentNearestPoint,
      currentPoint,
    ) => {
      const currentDistance = Math.abs(
        currentPoint.timestamp -
          timestamp,
      )

      const nearestDistance = Math.abs(
        currentNearestPoint.timestamp -
          timestamp,
      )

      return currentDistance <
        nearestDistance
        ? currentPoint
        : currentNearestPoint
    },
  )

  return nearestPoint.price
}

function createEventMarkers(
  events: GtaEvent[],
  chartData: ChartPoint[],
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

  const eventGroups =
    new Map<string, GtaEvent[]>()

  events.forEach((gtaEvent) => {
    const eventDate =
      normalizeDate(
        gtaEvent.occurredAtUtc,
      )

    const timestamp =
      eventDate.getTime()

    if (!Number.isFinite(timestamp)) {
      return
    }

    const dateKey =
      eventDate
        .toISOString()
        .slice(0, 10)

    const currentGroup =
      eventGroups.get(dateKey) ?? []

    currentGroup.push(gtaEvent)

    eventGroups.set(
      dateKey,
      currentGroup,
    )
  })

  return Array.from(
    eventGroups.entries(),
  )
    .map(
      ([dateKey, groupedEvents]) => {
        const timestamp = Math.min(
          ...groupedEvents.map(
            (gtaEvent) =>
              normalizeDate(
                gtaEvent.occurredAtUtc,
              ).getTime(),
          ),
        )

        if (
          timestamp <
            minimumTimestamp ||
          timestamp >
            maximumTimestamp
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

        const chartPosition =
          maximumTimestamp ===
          minimumTimestamp
            ? 0
            : (timestamp -
                minimumTimestamp) /
              (maximumTimestamp -
                minimumTimestamp)

        const label =
          groupedEvents.length === 1
            ? shortenTitle(
                groupedEvents[0].title,
              )
            : `${groupedEvents.length} eventos GTA VI`

        return {
          id: `${dateKey}-${groupedEvents
            .map(
              (gtaEvent) =>
                gtaEvent.id,
            )
            .join('-')}`,
          label,
          timestamp,
          price,
          labelSide:
            chartPosition >= 0.75
              ? 'left'
              : 'right',
        } satisfies EventMarker
      },
    )
    .filter(
      (
        marker,
      ): marker is EventMarker =>
        marker !== null,
    )
}

function EventMarkerLabel({
  label,
  side,
  viewBox,
}: EventMarkerLabelProps) {
  const x = viewBox?.x ?? 0
  const y = (viewBox?.y ?? 0) + 10

  const horizontalOffset =
    side === 'left' ? -8 : 8

  return (
    <text
      x={x + horizontalOffset}
      y={y}
      fill="var(--primary-text)"
      fontSize={11}
      fontWeight={700}
      textAnchor={
        side === 'left'
          ? 'end'
          : 'start'
      }
      dominantBaseline="hanging"
      pointerEvents="none"
    >
      {label}
    </text>
  )
}

export function StockChart({
  values,
  events,
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
            top: 72,
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
                stopColor="var(--accent-blue)"
                stopOpacity={0.42}
              />

              <stop
                offset="100%"
                stopColor="var(--accent-blue)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--border-color)"
            strokeDasharray="4 4"
            vertical={false}
          />

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

          {eventMarkers.map(
            (marker) => (
              <ReferenceLine
                key={`line-${marker.id}`}
                x={marker.timestamp}
                stroke="var(--accent-pink)"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={
                  <EventMarkerLabel
                    label={
                      marker.label
                    }
                    side={
                      marker.labelSide
                    }
                  />
                }
              />
            ),
          )}

          <Area
            type="monotone"
            dataKey="price"
            name="Fechamento"
            stroke="var(--accent-blue)"
            strokeWidth={3}
            fill="url(#stockPriceGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill:
                'var(--accent-blue)',
            }}
            isAnimationActive={false}
          />

          {eventMarkers.map(
            (marker) => (
              <ReferenceDot
                key={`dot-${marker.id}`}
                x={marker.timestamp}
                y={marker.price}
                r={7}
                fill="var(--accent-pink)"
                stroke="var(--panel-background)"
                strokeWidth={3}
              />
            ),
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}