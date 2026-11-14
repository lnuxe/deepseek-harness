/**
 * Host-state hooks. Mirrors the Cursor `cursor/canvas` hooks but decoupled from
 * the Cursor client: the SDK reads an optional `window.__dshCanvas` /
 * `window.__cursorCanvas` bridge when present, and falls back to
 * `prefers-color-scheme` (theme) / `localStorage` (persisted state) /
 * `postMessage` (actions) otherwise, so the package stays dependency-free and
 * works inside any sandboxed iframe that injects the bridge.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CanvasPalette, CanvasTokens, CanvasHostThemeOverrides } from './tokens.js'
import { buildHostTokens } from './tokens.js'

export interface CanvasHostTheme extends CanvasTokens {
  readonly kind: string
  readonly tokens: CanvasTokens
  readonly palette: CanvasPalette
}

/** Raw theme payload read from the host bridge. Every field is unknown on purpose. */
interface RawHostThemeState {
  readonly kind?: unknown
  readonly primary?: unknown
  readonly editorBackground?: unknown
  readonly editorForeground?: unknown
}

interface CanvasBridge {
  readonly state?: {
    readonly theme?: RawHostThemeState
    readonly state?: Record<string, unknown>
  }
}

function readBridge(): CanvasBridge | undefined {
  if (typeof window === 'undefined') return undefined
  const anyWindow = window as unknown as {
    __dshCanvas?: CanvasBridge
    __cursorCanvas?: CanvasBridge
  }
  return anyWindow.__dshCanvas ?? anyWindow.__cursorCanvas
}

/** Resolve the host theme from a raw payload; falls back to `prefers-color-scheme`. */
export function resolveTheme(raw: RawHostThemeState | undefined): CanvasHostTheme {
  let kind = 'dark'
  if (typeof raw?.kind === 'string') {
    kind = raw.kind
  } else if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    kind = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  const overrides: CanvasHostThemeOverrides = {
    ...(typeof raw?.primary === 'string' ? { primary: raw.primary } : {}),
    ...(typeof raw?.editorBackground === 'string' ? { editorBackground: raw.editorBackground } : {}),
    ...(typeof raw?.editorForeground === 'string' ? { editorForeground: raw.editorForeground } : {}),
  }
  const { tokens, palette } = buildHostTokens(kind, overrides)
  return { ...tokens, kind, tokens, palette }
}

/** Fallback tokens for environments with no host state (kept as a module singleton). */
let fallbackTheme: CanvasHostTheme | undefined
function getFallbackTheme(): CanvasHostTheme {
  if (!fallbackTheme) {
    fallbackTheme = resolveTheme(undefined)
  }
  return fallbackTheme
}

/** Subscribe to the host theme channel and return the resolved theme. */
export function useHostTheme(): CanvasHostTheme {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const bridge = readBridge()
    if (!bridge?.state) return
    // Minimal invalidation: re-resolve on window focus, which is when a host
    // most commonly flips its theme. A richer host can dispatch a CustomEvent.
    const onFocus = () => setVersion(v => v + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  return useMemo(() => {
    const raw = readBridge()?.state?.theme
    return raw ? resolveTheme(raw) : getFallbackTheme()
  }, [version])
}

export type SetCanvasState<T> = (action: T | ((prev: T) => T)) => void

const STORAGE_PREFIX = 'dsh-canvas:'

function readPersisted<T>(key: string, defaultValue: T): T {
  const bridge = readBridge()
  const bridgeValue = bridge?.state?.state?.[key]
  if (bridgeValue !== undefined) return bridgeValue as T
  try {
    const stored = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_PREFIX + key)
      : null
    if (stored != null) return JSON.parse(stored) as T
  } catch {
    // Ignore corrupt storage and fall through to the default.
  }
  return defaultValue
}

function writePersisted<T>(key: string, value: T): void {
  const bridge = readBridge()
  if (bridge?.state?.state) {
    (bridge.state.state as Record<string, unknown>)[key] = value
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    }
  } catch {
    // Storage may be unavailable in a sandbox; the bridge write above is best-effort too.
  }
}

/**
 * Persistent state hook. Works like `React.useState` but the value survives
 * rebuilds and reloads (stored in the host bridge or `localStorage`).
 */
export function useCanvasState<T>(key: string, defaultValue: T): [T, SetCanvasState<T>] {
  const [value, setValue] = useState<T>(() => readPersisted(key, defaultValue))
  const setter: SetCanvasState<T> = (action) => {
    setValue((prev) => {
      const next = typeof action === 'function' ? (action as (p: T) => T)(prev) : action
      writePersisted(key, next)
      return next
    })
  }
  return [value, setter]
}

/**
 * IDE actions dispatched from canvas buttons (fire-and-forget):
 * `openAgent{agentId}`, `newComposerChat{userPrompt}`, `openFile{path, selection}`.
 */
export type CanvasAction =
  | { type: 'openAgent'; agentId: string }
  | { type: 'newComposerChat'; userPrompt?: string }
  | { type: 'openFile'; path: string; selection?: { line?: number; column?: number } }

/** Returns a stable dispatch function that forwards the action to the host. */
export function useCanvasAction(): (action: CanvasAction) => void {
  const ref = useRef<(action: CanvasAction) => void>(() => {})
  ref.current = (action: CanvasAction) => {
    try {
      window.parent?.postMessage({ source: 'dsh-canvas', action }, '*')
    } catch {
      // No host to talk to; actions are best-effort.
    }
  }
  return (action: CanvasAction) => ref.current(action)
}
