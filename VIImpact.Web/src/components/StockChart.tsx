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
  title: string
  timestamp: number
  price: number
}

function normalizeDate(dateText: string): Date {
  const hasTimezone =
    dateText.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(dateText)

  return new Date(
    hasTimezone ? dateText : `${dateText}Z`,
  )
}

function formatAxisDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  }).format(new Date(timestamp))
}

function formatTooltipDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
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
        index / (numberOfTicks - 1)

      return Math.round(
        minimumTimestamp + range * position,
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
    (currentNearestPoint, currentPoint) => {
      const currentDistance = Math.abs(
        currentPoint.timestamp - timestamp,
      )

      const nearestDistance = Math.abs(
        currentNearestPoint.timestamp - timestamp,
      )

      return currentDistance < nearestDistance
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
    chartData[chartData.length - 1].timestamp

  return events
    .map((gtaEvent) => {
      const timestamp = normalizeDate(
        gtaEvent.occurredAtUtc,
      ).getTime()

      if (
        !Number.isFinite(timestamp) ||
        timestamp < minimumTimestamp ||
        timestamp > maximumTimestamp
      ) {
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

export function StockChart({
  values,
  events,
}: StockChartProps) {
  const chartData = createChartData(values)

  const axisTicks = createAxisTicks(
    chartData,
    7,
  )

  const eventMarkers = createEventMarkers(
    events,
    chartData,
  )

  return (
    <div
      className="stock-chart-container"
      style={{ width: '100%', height: 450 }}
    >
      <ResponsiveContainer width="100%" height="100%">
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
            domain={['dataMin', 'dataMax']}
            ticks={axisTicks}
            interval={0}
            tickFormatter={(timestamp) =>
              formatAxisDate(Number(timestamp))
            }
            tick={{
              fill: 'var(--secondary-text)',
              fontSize: 12,
              fontWeight: 600,
            }}
            axisLine={{
              stroke: 'var(--border-color)',
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
              'Fechamento',
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
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}