import { describe, expect, it } from 'vitest'
import type { GtaEvent } from '../types/dashboard'
import {
  getGtaEventPresentation,
  isOccurredGtaEvent,
} from './gtaEventPresentation'

function createEvent(
  overrides: Partial<GtaEvent> = {},
): GtaEvent {
  return {
    id: 'event-test',
    slug: 'event-test',
    title: 'Evento de teste',
    description: 'Descrição do evento de teste.',
    sourceUrl: '',
    occurredAtUtc: '2025-05-06T00:00:00Z',
    ...overrides,
  }
}

describe('gtaEventPresentation', () => {
  it('normalizes numeric and textual API categories to the same presentation', () => {
    const numericPresentation =
      getGtaEventPresentation(
        createEvent({ category: 5 }),
      )
    const textualPresentation =
      getGtaEventPresentation(
        createEvent({ category: 'Delay' }),
      )

    expect(numericPresentation.label).toBe(
      'Adiamento',
    )
    expect(textualPresentation.label).toBe(
      'Adiamento',
    )
  })

  it('infers a useful fallback category when the API category is absent', () => {
    const presentation = getGtaEventPresentation(
      createEvent({
        title: 'Novo vazamento relacionado ao GTA VI',
        description:
          'O material vazado passou a circular publicamente.',
      }),
    )

    expect(presentation.label).toBe('Vazamento')
  })

  it('respects explicit event status and falls back to the event date when status is absent', () => {
    const referenceDate = new Date(
      '2026-08-21T12:00:00Z',
    )

    expect(
      isOccurredGtaEvent(
        createEvent({ status: 'Occurred' }),
        referenceDate,
      ),
    ).toBe(true)
    expect(
      isOccurredGtaEvent(
        createEvent({ status: 'Scheduled' }),
        referenceDate,
      ),
    ).toBe(false)
    expect(
      isOccurredGtaEvent(
        createEvent({ status: 'Cancelled' }),
        referenceDate,
      ),
    ).toBe(false)
    expect(
      isOccurredGtaEvent(
        createEvent({
          status: undefined,
          occurredAtUtc: '2026-08-20T00:00:00Z',
        }),
        referenceDate,
      ),
    ).toBe(true)
    expect(
      isOccurredGtaEvent(
        createEvent({
          status: undefined,
          occurredAtUtc: '2026-08-22T00:00:00Z',
        }),
        referenceDate,
      ),
    ).toBe(false)
  })
})
