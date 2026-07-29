import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { StockQuote } from '../types/dashboard'

interface StockChartProps {
  quotes: StockQuote[]
}

interface ChartPoint {
  price: number
  recordedAtUtc: string
  formattedDate: string
}

function formatDate(dateText: string): string {
  const hasTimezone =
    dateText.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(dateText)

  const normalizedDate = hasTimezone
    ? dateText
    : `${dateText}Z`

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(normalizedDate))
}

export function StockChart({ quotes }: StockChartProps) {
  const chartData: ChartPoint[] = quotes.map((quote) => ({
    price: quote.price,
    recordedAtUtc: quote.recordedAtUtc,
    formattedDate: formatDate(quote.recordedAtUtc),
  }))

  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 24,
            bottom: 10,
            left: 8,
          }}
        >
          <CartesianGrid strokeDasharray="4 4" />

          <XAxis
            dataKey="formattedDate"
            minTickGap={32}
          />

          <YAxis
            dataKey="price"
            domain={['auto', 'auto']}
            width={72}
          />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="price"
            name="Preço"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}