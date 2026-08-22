export interface PinchViewport {
  startIndex: number
  endIndex: number
}

interface CreatePinchViewportOptions {
  viewport: PinchViewport
  totalPointCount: number
  minimumViewportSpan: number
  initialDistance: number
  currentDistance: number
  initialAnchorRatio: number
  currentAnchorRatio: number
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(
    minimum,
    Math.min(value, maximum),
  )
}

export function createPinchViewport({
  viewport,
  totalPointCount,
  minimumViewportSpan,
  initialDistance,
  currentDistance,
  initialAnchorRatio,
  currentAnchorRatio,
}: CreatePinchViewportOptions): PinchViewport {
  if (
    totalPointCount <= 1 ||
    !Number.isFinite(initialDistance) ||
    !Number.isFinite(currentDistance) ||
    initialDistance <= 0 ||
    currentDistance <= 0
  ) {
    return viewport
  }

  const lastIndex = totalPointCount - 1
  const currentSpan = clamp(
    viewport.endIndex - viewport.startIndex,
    minimumViewportSpan,
    lastIndex,
  )
  const initialAnchor = clamp(
    initialAnchorRatio,
    0,
    1,
  )
  const currentAnchor = clamp(
    currentAnchorRatio,
    0,
    1,
  )
  const anchorIndex =
    viewport.startIndex +
    currentSpan * initialAnchor
  const targetSpan = clamp(
    currentSpan *
      (initialDistance / currentDistance),
    minimumViewportSpan,
    lastIndex,
  )
  const startIndex = clamp(
    anchorIndex -
      targetSpan * currentAnchor,
    0,
    lastIndex - targetSpan,
  )

  return {
    startIndex,
    endIndex: startIndex + targetSpan,
  }
}
