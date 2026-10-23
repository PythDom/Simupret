import '@testing-library/jest-dom/vitest';

// Recharts (ResponsiveContainer) a besoin de ResizeObserver, absent de jsdom.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom n'implémente pas le défilement.
window.scrollTo = () => undefined;
