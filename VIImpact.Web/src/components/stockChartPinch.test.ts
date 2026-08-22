import {
  describe,
  expect,
  it,
} from 'vitest'
import { createPinchViewport } from './stockChartPinch'

describe('createPinchViewport', () => {
  it('zooms in around the pinch anchor when fingers move apart', () => {
    const viewport = createPinchViewport({
      viewport: {
        startIndex: 0,
        endIndex: 99,
      },
      totalPointCount: 100,
      minimumViewportSpan: 2,
      initialDistance: 100,
      currentDistance: 200,
      initialAnchorRatio: 0.5,
      currentAnchorRatio: 0.5,
    })

    expect(viewport.startIndex).toBeCloseTo(
      24.75,
    )
    expect(viewport.endIndex).toBeCloseTo(
      74.25,
    )
  })

  it('keeps the same data anchor under a moving pinch midpoint', () => {
    const viewport = createPinchViewport({
      viewport: {
        startIndex: 20,
        endIndex: 79,
      },
      totalPointCount: 100,
      minimumViewportSpan: 2,
      initialDistance: 120,
      currentDistance: 240,
      initialAnchorRatio: 0.5,
      currentAnchorRatio: 0.7,
    })

    expect(viewport.startIndex).toBeCloseTo(
      28.85,
    )
    expect(viewport.endIndex).toBeCloseTo(
      58.35,
    )
  })

  it('clamps pinch zoom to the minimum and complete viewport spans', () => {
    const zoomedIn = createPinchViewport({
      viewport: {
        startIndex: 20,
        endIndex: 79,
      },
      totalPointCount: 100,
      minimumViewportSpan: 2,
      initialDistance: 100,
      currentDistance: 10000,
      initialAnchorRatio: 0.5,
      currentAnchorRatio: 0.5,
    })

    expect(
      zoomedIn.endIndex -
        zoomedIn.startIndex,
    ).toBeCloseTo(2)

    const zoomedOut = createPinchViewport({
      viewport: {
        startIndex: 20,
        endIndex: 79,
      },
      totalPointCount: 100,
      minimumViewportSpan: 2,
      initialDistance: 200,
      currentDistance: 20,
      initialAnchorRatio: 0.5,
      currentAnchorRatio: 0.5,
    })

    expect(zoomedOut).toEqual({
      startIndex: 0,
      endIndex: 99,
    })
  })
})
