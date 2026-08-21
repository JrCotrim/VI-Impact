import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(window, 'requestAnimationFrame', {
  configurable: true,
  value: (callback: FrameRequestCallback) =>
    window.setTimeout(
      () => callback(performance.now()),
      0,
    ),
})

Object.defineProperty(window, 'cancelAnimationFrame', {
  configurable: true,
  value: (handle: number) =>
    window.clearTimeout(handle),
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.removeAttribute(
    'data-theme',
  )
  window.history.replaceState({}, '', '/')
})
