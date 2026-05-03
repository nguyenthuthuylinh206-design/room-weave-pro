import '@testing-library/jest-dom'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// ResizeObserver stub (Radix UI)
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver = RO

// scrollIntoView stub for jsdom
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
