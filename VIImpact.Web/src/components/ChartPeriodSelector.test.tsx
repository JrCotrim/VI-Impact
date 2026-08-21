import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChartPeriodSelector } from './ChartPeriodSelector'
import type { StockTimeSeriesPeriod } from '../types/dashboard'

interface HarnessOptions {
  initialPeriod?: StockTimeSeriesPeriod
  initialStartDate?: string
  initialEndDate?: string
}

function renderSelector(options: HarnessOptions = {}) {
  const onPeriodChange = vi.fn()
  const onCustomDateChange = vi.fn()
  const onApplyCustomPeriod = vi.fn()

  function Harness() {
    const [selectedPeriod, setSelectedPeriod] =
      useState<StockTimeSeriesPeriod>(
        options.initialPeriod ?? '1M',
      )
    const [customStartDate, setCustomStartDate] =
      useState(options.initialStartDate ?? '')
    const [customEndDate, setCustomEndDate] =
      useState(options.initialEndDate ?? '')

    return (
      <ChartPeriodSelector
        selectedPeriod={selectedPeriod}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        isLoading={false}
        onPeriodChange={(period) => {
          onPeriodChange(period)
          setSelectedPeriod(period)
        }}
        onCustomDateChange={(field, value) => {
          onCustomDateChange(field, value)

          if (field === 'start') {
            setCustomStartDate(value)
            return
          }

          setCustomEndDate(value)
        }}
        onApplyCustomPeriod={() => {
          onApplyCustomPeriod()
          setSelectedPeriod('CUSTOM')
        }}
      />
    )
  }

  render(<Harness />)

  return {
    onPeriodChange,
    onCustomDateChange,
    onApplyCustomPeriod,
  }
}

describe('ChartPeriodSelector', () => {
  it('selects a predefined period through the visible control', async () => {
    const user = userEvent.setup()
    const { onPeriodChange } = renderSelector()

    const sevenDaysButton = screen.getByRole(
      'button',
      { name: /7D/ },
    )

    await user.click(sevenDaysButton)

    expect(onPeriodChange).toHaveBeenCalledWith('7D')
    expect(sevenDaysButton).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('blocks an incomplete custom period', async () => {
    const user = userEvent.setup()
    const { onApplyCustomPeriod } = renderSelector()

    await user.click(
      screen.getByRole('button', {
        name: 'Selecionar período personalizado',
      }),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Aplicar período',
      }),
    )

    expect(
      screen.getByText('Selecione as duas datas.'),
    ).toBeInTheDocument()
    expect(onApplyCustomPeriod).not.toHaveBeenCalled()
  })

  it('blocks a custom period whose start date is after its end date', async () => {
    const user = userEvent.setup()
    const { onApplyCustomPeriod } = renderSelector({
      initialStartDate: '2026-08-20',
      initialEndDate: '2026-08-10',
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Selecionar período personalizado',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Aplicar período',
      }),
    )

    expect(
      screen.getByText(
        'A data inicial não pode ser posterior à data final.',
      ),
    ).toBeInTheDocument()
    expect(onApplyCustomPeriod).not.toHaveBeenCalled()
  })

  it('applies a valid custom period and closes the date panel', async () => {
    const user = userEvent.setup()
    const {
      onCustomDateChange,
      onApplyCustomPeriod,
    } = renderSelector()

    const calendarButton = screen.getByRole(
      'button',
      {
        name: 'Selecionar período personalizado',
      },
    )

    await user.click(calendarButton)
    fireEvent.change(
      screen.getByLabelText('Data inicial'),
      { target: { value: '2026-08-01' } },
    )
    fireEvent.change(
      screen.getByLabelText('Data final'),
      { target: { value: '2026-08-10' } },
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Aplicar período',
      }),
    )

    expect(onCustomDateChange).toHaveBeenCalledWith(
      'start',
      '2026-08-01',
    )
    expect(onCustomDateChange).toHaveBeenCalledWith(
      'end',
      '2026-08-10',
    )
    expect(onApplyCustomPeriod).toHaveBeenCalledTimes(1)
    expect(calendarButton).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(
      screen.queryByLabelText('Data inicial'),
    ).not.toBeInTheDocument()
  })
})
