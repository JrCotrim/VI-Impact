import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  GtaEvent,
  StockQuote,
} from '../types/dashboard'

interface StockChartProps {
  quotes: StockQuote[]
  events: GtaEvent[]
}

interface ChartPoint {
  price: number
  timestamp: number
}

interface EventMarker {
  id: string
  title: string
  timestamp: number
  price: number
}

interface AxisTickProps {
  x?: number
  y?: number
  payload?: {
    value: number
  }
}

function normalizeDate(dateText: string): Date {
  const hasTimezone =
    dateText.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(dateText)

  const normalizedDate = hasTimezone
    ? dateText
    : `${dateText}Z`

  return new Date(normalizedDate)
}

function formatAxisDate(
  timestamp: number,
): {
  date: string
  time: string
} {
  const date = new Date(timestamp)

  return {
    date: new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date),

    time: new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  }
}

function formatTooltipDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(timestamp))
}

function shortenTitle(title: string): string {
  const maximumLength = 18

  if (title.length <= maximumLength) {
    return title
  }

  return `${title.slice(0, maximumLength)}...`
}

function createChartData(
  quotes: StockQuote[],
): ChartPoint[] {
  const pointsByTimestamp =
    new Map<number, ChartPoint>()

  for (const quote of quotes) {
    const timestamp = normalizeDate(
      quote.recordedAtUtc,
    ).getTime()

    if (!Number.isFinite(timestamp)) {
      continue
    }

    pointsByTimestamp.set(timestamp, {
      timestamp,
      price: quote.price,
    })
  }

  return Array.from(pointsByTimestamp.values()).sort(
    (firstPoint, secondPoint) =>
      firstPoint.timestamp - secondPoint.timestamp,
  )
}

function createAxisTicks(
  points: ChartPoint[],
  numberOfTicks = 5,
): number[] {
  if (points.length === 0) {
    return []
  }

  const minimumTimestamp = points[0].timestamp
  const maximumTimestamp =
    points[points.length - 1].timestamp

  if (minimumTimestamp === maximumTimestamp) {
    return [minimumTimestamp]
  }

  const range =
    maximumTimestamp - minimumTimestamp

  return Array.from(
    { length: numberOfTicks },
    (_, index) => {
      const position =
        (index + 1) / (numberOfTicks + 1)

      return Math.round(
        minimumTimestamp + range * position,
      )
    },
  )
}

function createAxisDomain(
  points: ChartPoint[],
): [number, number] {
  if (points.length === 0) {
    return [0, 1]
  }

  const minimumTimestamp = points[0].timestamp
  const maximumTimestamp =
    points[points.length - 1].timestamp

  if (minimumTimestamp === maximumTimestamp) {
    const oneHour = 60 * 60 * 1000

    return [
      minimumTimestamp - oneHour,
      maximumTimestamp + oneHour,
    ]
  }

  const range =
    maximumTimestamp - minimumTimestamp

  const padding = range * 0.04

  return [
    minimumTimestamp - padding,
    maximumTimestamp + padding,
  ]
}

function calculateEventPrice(
  points: ChartPoint[],
  timestamp: number,
): number | null {
  if (points.length === 0) {
    return null
  }

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  if (
    timestamp < firstPoint.timestamp ||
    timestamp > lastPoint.timestamp
  ) {
    return null
  }

  const rightPointIndex = points.findIndex(
    (point) => point.timestamp >= timestamp,
  )

  if (rightPointIndex === 0) {
    return firstPoint.price
  }

  if (rightPointIndex === -1) {
    return lastPoint.price
  }

  const rightPoint = points[rightPointIndex]
  const leftPoint = points[rightPointIndex - 1]

  if (rightPoint.timestamp === leftPoint.timestamp) {
    return rightPoint.price
  }

  const progress =
    (timestamp - leftPoint.timestamp) /
    (rightPoint.timestamp - leftPoint.timestamp)

  return (
    leftPoint.price +
    (rightPoint.price - leftPoint.price) * progress
  )
}

function createEventMarkers(
  events: GtaEvent[],
  chartData: ChartPoint[],
): EventMarker[] {
  return events
    .map((gtaEvent) => {
      const timestamp = normalizeDate(
        gtaEvent.occurredAtUtc,
      ).getTime()

      if (!Number.isFinite(timestamp)) {
        return null
      }

      const price = calculateEventPrice(
        chartData,
        timestamp,
      )

      if (price === null) {
        return null
      }

      return {
        id: gtaEvent.id,
        title: gtaEvent.title,
        timestamp,
        price,
      }
    })
    .filter(
      (
        marker,
      ): marker is EventMarker =>
        marker !== null,
    )
}

function CustomXAxisTick({
  x = 0,
  y = 0,
  payload,
}: AxisTickProps) {
  if (!payload) {
    return null
  }

  const formattedDate =
    formatAxisDate(payload.value)

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text
        x={0}
        y={0}
        dy={18}
        textAnchor="middle"
        fill="var(--secondary-text)"
        fontSize={12}
        fontWeight={700}
      >
        {formattedDate.date}
      </text>

      <text
        x={0}
        y={0}
        dy={35}
        textAnchor="middle"
        fill="var(--muted-text)"
        fontSize={11}
      >
        {formattedDate.time}
      </text>
    </g>
  )
}

export function StockChart({
  quotes,
  events,
}: StockChartProps) {
  const chartData = createChartData(quotes)

  const axisTicks = createAxisTicks(
    chartData,
    5,
  )

  const axisDomain = createAxisDomain(
    chartData,
  )

  const eventMarkers = createEventMarkers(
    events,
    chartData,
  )

  return (
    <div
      className="stock-chart-container"
      style={{ width: '100%', height: 430 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 72,
            right: 32,
            bottom: 42,
            left: 22,
          }}
        >
          <CartesianGrid
            stroke="var(--border-color)"
            strokeDasharray="4 4"
            vertical={false}
          />

          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={axisDomain}
            ticks={axisTicks}
            interval={0}
            height={62}
            tick={<CustomXAxisTick />}
            axisLine={{
              stroke: 'var(--border-color)',
            }}
            tickLine={false}
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
              fill: 'var(--secondary-text)',
              fontSize: 12,
            }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            labelFormatter={(timestamp) =>
              formatTooltipDate(Number(timestamp))
            }
            formatter={(value) => [
              `US$ ${Number(value).toFixed(2)}`,
              'Preço',
            ]}
            contentStyle={{
              color: 'var(--primary-text)',
              background: 'var(--panel-background)',
              border:
                '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: 'var(--card-shadow)',
            }}
          />

          {eventMarkers.map((marker) => (
            <ReferenceLine
              key={`line-${marker.id}`}
              x={marker.timestamp}
              stroke="var(--accent-pink)"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: shortenTitle(marker.title),
                position: 'insideTopLeft',
                fill: 'var(--primary-text)',
                fontSize: 11,
                fontWeight: 700,
              }}
            />
          ))}

          <Line
            type="monotone"
            dataKey="price"
            name="Preço"
            stroke="var(--accent-blue)"
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 5,
              fill: 'var(--accent-blue)',
            }}
            isAnimationActive={false}
          />

          {eventMarkers.map((marker) => (
            <ReferenceDot
              key={`dot-${marker.id}`}
              x={marker.timestamp}
              y={marker.price}
              r={7}
              fill="var(--accent-pink)"
              stroke="var(--panel-background)"
              strokeWidth={3}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}