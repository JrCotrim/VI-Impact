import {
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import './ChartPeriodSelector.css'
import type {
  StockPeriodPerformance,
  StockTimeSeriesPeriod,
} from '../types/dashboard'

interface ChartPeriodSelectorProps {
  selectedPeriod: StockTimeSeriesPeriod
  customStartDate: string
  customEndDate: string
  isLoading: boolean
  performances?: StockPeriodPerformance[]
  onPeriodChange: (
    period: StockTimeSeriesPeriod,
  ) => void
  onCustomDateChange: (
    field: 'start' | 'end',
    value: string,
  ) => void
  onApplyCustomPeriod: () => void
}

const periodOptions: {
  value: StockTimeSeriesPeriod
  label: string
  description: string
}[] = [
  {
    value: '1D',
    label: '1D',
    description: 'Último dia de pregão',
  },
  {
    value: '7D',
    label: '7D',
    description: 'Últimos 7 dias',
  },
  {
    value: '1M',
    label: '1M',
    description: 'Último mês',
  },
  {
    value: '3M',
    label: '3M',
    description: 'Últimos 3 meses',
  },
  {
    value: '6M',
    label: '6M',
    description: 'Últimos 6 meses',
  },
  {
    value: 'YTD',
    label: 'YTD',
    description: 'Desde o início do ano',
  },
  {
    value: '1Y',
    label: '1A',
    description: 'Último ano',
  },
  {
    value: '2Y',
    label: '2A',
    description: 'Últimos 2 anos',
  },
  {
    value: '5Y',
    label: '5A',
    description: 'Últimos 5 anos',
  },
  {
    value: 'MAX',
    label: 'Máx.',
    description: 'Máximo histórico disponível',
  },
]

function getTodayDate(): string {
  const currentDate = new Date()

  const localDate = new Date(
    currentDate.getTime() -
      currentDate.getTimezoneOffset() *
        60 *
        1000,
  )

  return localDate
    .toISOString()
    .slice(0, 10)
}

function formatPerformance(
  changePercent: number,
): string {
  const formattedValue =
    Math.abs(changePercent).toLocaleString(
      'pt-BR',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )

  if (changePercent > 0) {
    return `+${formattedValue}%`
  }

  if (changePercent < 0) {
    return `-${formattedValue}%`
  }

  return `${formattedValue}%`
}

function getPerformanceClassName(
  changePercent: number | null,
): string {
  if (changePercent === null) {
    return 'chart-period-performance unavailable'
  }

  if (changePercent > 0) {
    return 'chart-period-performance positive'
  }

  if (changePercent < 0) {
    return 'chart-period-performance negative'
  }

  return 'chart-period-performance neutral'
}

function PeriodLoadingSpinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{
        display: 'block',
        flex: '0 0 12px',
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.24"
      />
      <path
        d="M12 4a8 8 0 0 1 8 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.72s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}

export function ChartPeriodSelector({
  selectedPeriod,
  customStartDate,
  customEndDate,
  isLoading,
  performances = [],
  onPeriodChange,
  onCustomDateChange,
  onApplyCustomPeriod,
}: ChartPeriodSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] =
    useState(false)

  const [
    validationMessage,
    setValidationMessage,
  ] = useState<string | null>(null)

  const maximumDate = useMemo(
    () => getTodayDate(),
    [],
  )

  const performancesByPeriod = useMemo(
    () =>
      new Map(
        performances.map((performance) => [
          performance.period,
          performance.changePercent,
        ]),
      ),
    [performances],
  )

  function handlePeriodChange(
    period: StockTimeSeriesPeriod,
  ) {
    setValidationMessage(null)
    setIsCalendarOpen(false)
    onPeriodChange(period)
  }

  function handleCalendarToggle() {
    setValidationMessage(null)

    setIsCalendarOpen(
      (currentValue) => !currentValue,
    )
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !customStartDate ||
      !customEndDate
    ) {
      setValidationMessage(
        'Selecione as duas datas.',
      )

      return
    }

    if (customStartDate > customEndDate) {
      setValidationMessage(
        'A data inicial não pode ser posterior à data final.',
      )

      return
    }

    setValidationMessage(null)
    onApplyCustomPeriod()
    setIsCalendarOpen(false)
  }

  return (
    <section className="chart-period-section">
      <div className="chart-period-toolbar">
        <div
          className="chart-period-options"
          aria-label="Período do gráfico"
          aria-busy={isLoading}
        >
          {periodOptions.map((option) => {
            const isActive =
              selectedPeriod === option.value

            const isUpdating =
              isLoading && isActive

            const changePercent =
              performancesByPeriod.get(
                option.value,
              ) ?? null

            return (
              <button
                key={option.value}
                className={[
                  'chart-period-button',
                  isActive ? 'active' : '',
                  isUpdating ? 'updating' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="button"
                title={option.description}
                aria-pressed={isActive}
                aria-busy={isUpdating}
                disabled={isLoading}
                onClick={() =>
                  handlePeriodChange(
                    option.value,
                  )
                }
              >
                <span
                  className="chart-period-label"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  {option.label}
                  {isUpdating && (
                    <PeriodLoadingSpinner />
                  )}
                </span>

                <span
                  className={getPerformanceClassName(
                    changePercent,
                  )}
                >
                  {changePercent === null
                    ? '—'
                    : formatPerformance(
                        changePercent,
                      )}
                </span>
              </button>
            )
          })}

          <button
            className={[
              'calendar-period-button',
              selectedPeriod === 'CUSTOM'
                ? 'active'
                : '',
              selectedPeriod === 'CUSTOM' &&
              isLoading
                ? 'updating'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            type="button"
            title="Selecionar período personalizado"
            aria-label="Selecionar período personalizado"
            aria-expanded={isCalendarOpen}
            aria-busy={
              selectedPeriod === 'CUSTOM' &&
              isLoading
            }
            disabled={isLoading}
            onClick={handleCalendarToggle}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 9H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8ZM6 6a1 1 0 0 0-1 1v2h14V7a1 1 0 0 0-1-1H6Z" />
            </svg>

            <span
              className="calendar-period-text"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              Datas
              {selectedPeriod === 'CUSTOM' &&
                isLoading && (
                  <PeriodLoadingSpinner />
                )}
            </span>
          </button>
        </div>

      </div>

      {isCalendarOpen && (
        <form
          className="custom-period-panel"
          onSubmit={handleSubmit}
        >
          <div className="custom-date-field">
            <label htmlFor="custom-start-date">
              Data inicial
            </label>

            <input
              id="custom-start-date"
              type="date"
              value={customStartDate}
              max={maximumDate}
              onChange={(event) =>
                onCustomDateChange(
                  'start',
                  event.target.value,
                )
              }
            />
          </div>

          <div className="custom-date-field">
            <label htmlFor="custom-end-date">
              Data final
            </label>

            <input
              id="custom-end-date"
              type="date"
              value={customEndDate}
              max={maximumDate}
              onChange={(event) =>
                onCustomDateChange(
                  'end',
                  event.target.value,
                )
              }
            />
          </div>

          <button
            className="apply-custom-period-button"
            type="submit"
          >
            Aplicar período
          </button>

          {validationMessage && (
            <p className="custom-period-error">
              {validationMessage}
            </p>
          )}
        </form>
      )}
    </section>
  )
}