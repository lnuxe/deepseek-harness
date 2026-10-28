/**
 * Canvas sandbox runtime entry. Compiled by `build-runtime.mjs` into a single
 * browser IIFE that boots inside the document-preview iframe.
 *
 * This is the DSH equivalent of Cursor's built-in `.canvas.tsx` compiler
 * sandbox: it publishes the SDK (the `cursor/canvas` surface) and React onto
 * the sandbox `window`, applies the Cursor canvas body theme (surface color,
 * font stack, and the 24px/32px body padding), renders a compiled canvas
 * component into `#root`, and accepts a compiled component over `postMessage`.
 *
 * Layout alignment with Cursor's `canvas-runtime.esm.js`:
 * - `CANVAS_BODY_PADDING_VERTICAL_PX` / `CANVAS_BODY_PADDING_HORIZONTAL_PX`
 *   are Cursor's exact 24 / 32 px canvas-shell padding.
 * - `CANVAS_SANS_FONT_STACK` is Cursor's exact body font stack.
 * - `body` receives `background: tokens.bg.editor`, `color: tokens.text.primary`,
 *   `fontSize: 13px`, `lineHeight: 18px`, and the `--cursor-canvas-focus-ring-color`
 *   custom property, matching `applyBodyTheme`.
 *
 * Message shape accepted: `{ source: "dsh-canvas-document", js: string }`,
 * where `js` is a self-executing IIFE produced by the Host compile route that
 * assigns the canvas's default export to `window.__canvasComponent`.
 */
import { createRoot } from 'react-dom/client'
import * as React from 'react'
import * as SDK from '@deepseek-ai/dsh-client-ui-canvas'

declare const window: Window & {
  React: unknown
  __canvasSdk: unknown
  __canvasComponent?: unknown
  __canvasRender?: (Component: unknown) => void
  __canvasRoot?: ReturnType<typeof createRoot> | null
}

// Publish the sandbox surface. The Host-compiled canvas references exactly
// these globals: `window.React` for classic JSX (`React.createElement`) and
// `window.__canvasSdk` for the rewritten `cursor/canvas` imports.
window.React = React
window.__canvasSdk = SDK

/** Cursor's exact canvas body font stack. */
const CANVAS_SANS_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, "Ubuntu", "Droid Sans", sans-serif'
/** Cursor's canvas-shell body padding (vertical, horizontal) in px. */
const CANVAS_BODY_PADDING_VERTICAL_PX = 24
const CANVAS_BODY_PADDING_HORIZONTAL_PX = 32

type CanvasHostTheme = {
  readonly kind: string
  readonly tokens: {
    readonly bg: { readonly editor: string }
    readonly text: { readonly primary: string }
    readonly stroke: { readonly focused: string }
  }
}

function isLightKind(kind: string): boolean {
  return kind === 'light' || kind === 'hc-light'
}

/** Mirror of Cursor's `applyBodyTheme` for the non-preview canvas shell. */
function applyBodyTheme(theme: CanvasHostTheme): void {
  const s = document.body.style
  s.margin = '0'
  s.background = theme.tokens.bg.editor
  s.color = theme.tokens.text.primary
  s.colorScheme = isLightKind(theme.kind) ? 'light' : 'dark'
  s.fontFamily = CANVAS_SANS_FONT_STACK
  s.fontSize = '13px'
  s.lineHeight = '18px'
  s.setProperty('--cursor-canvas-focus-ring-color', theme.tokens.stroke.focused)
  s.padding = `${CANVAS_BODY_PADDING_VERTICAL_PX}px ${CANVAS_BODY_PADDING_HORIZONTAL_PX}px`
}

/** Mirror of Cursor's `CanvasShell`: apply the body theme, then render children. */
function CanvasShell({ children }: { children: React.ReactNode }) {
  const theme = (SDK as unknown as { useHostTheme(): CanvasHostTheme }).useHostTheme()
  React.useLayoutEffect(() => {
    applyBodyTheme(theme)
  }, [theme])
  return children
}

/** Error boundary mirroring Cursor's `HostRuntimeErrorBoundary`. */
class HostRuntimeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err: unknown) {
    console.error('[dsh-canvas] runtime error', err)
  }
  render() {
    return this.state.hasError ? null : this.props.children
  }
}

/** Render one compiled canvas component into the sandbox root. */
window.__canvasRender = function renderCanvas(Component) {
  const el = document.getElementById('root')
  if (!el) return
  if (!window.__canvasRoot) window.__canvasRoot = createRoot(el);
  (window.__canvasRoot as ReturnType<typeof createRoot>).render(
    React.createElement(
      HostRuntimeErrorBoundary,
      null,
      React.createElement(
        CanvasShell,
        null,
        React.createElement(Component as React.ComponentType),
      ),
    ),
  )
}

// Bridge: the document renderer posts the Host-compiled IIFE once the iframe
// has booted this runtime. It may also carry the host theme so the canvas
// follows the DSH editor theme (Cursor resolves the canvas surface from the
// host theme the same way). Executing the IIFE assigns
// `window.__canvasComponent`, which we then mount.
window.addEventListener('message', (ev) => {
  const data = ev.data as { source?: string; js?: string; theme?: { kind?: string } } | null
  if (!data || data.source !== 'dsh-canvas-document') return
  if (data.theme && data.theme.kind) {
    // Publish a `__dshCanvas` bridge before mounting so `useHostTheme` reads
    // the host theme instead of falling back to prefers-color-scheme.
    (window as unknown as { __dshCanvas?: unknown }).__dshCanvas = {
      state: { theme: { kind: data.theme.kind } },
    }
  }
  if (typeof data.js !== 'string' || data.js.length === 0) return
  try {
    window.__canvasComponent = undefined;
    (0, eval)(data.js)
    const Component = window.__canvasComponent
    if (Component && window.__canvasRender) window.__canvasRender(Component)
  } catch (err) {
    console.error('[dsh-canvas] render failed:', err)
  }
})
