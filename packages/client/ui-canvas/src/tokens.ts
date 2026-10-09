/**
 * Design tokens for `@deepseek-ai/dsh-client-ui-canvas`, a Cursor Canvas SDK
 * equivalent. Color values are the exact pinned copies Cursor ships in its
 * canvas runtime (`cursor-*-agent-runtime/dist/canvas-runtime.esm.js`), which
 * are themselves resolved from the `packages/ui` cursor-core themes through
 * `CURSOR_SEMANTIC_RULES`. Every value below is a flat solid (alpha-hex) color
 * string — no UI framework dependency.
 *
 * Mapping (dark base #F0F0F0, light base #141414):
 * - foreground*        → text-primary/secondary/tertiary/quaternary (100/74/60/36%)
 * - editor/chrome/sidebar/elevated → pinned cursor-core surface hexes
 * - fill*              → bg-primary/secondary/tertiary/quaternary (20/14/8/6%)
 * - stroke*            → stroke-primary/secondary/tertiary (20/12/8%)
 * - strokeFocused      → core `focus` at full opacity (accent in light mode)
 * - accent/button*     → bg-accent / action-label / bg-accent-hover
 * - link               → text-link
 * - diff*Line/Strip    → pinned cursor-core diff backgrounds + canvas alphas
 */

/** Append an alpha byte to a `#RRGGBB` hex. `percent` is 0-100. */
export function mixTransparent(base: string, percent: number): string {
  const alpha = Math.max(0, Math.min(100, percent))
  const byte = Math.round((alpha / 100) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
  return `${base}${byte}`
}

/** Mix `percent`% of `b` into `a` (both `#RRGGBB`), returning `#RRGGBB`. */
export function mixTwo(a: string, b: string, percent: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  const t = Math.max(0, Math.min(100, percent)) / 100
  const ch = (v: number, w: number) =>
    Math.round(v * (1 - t) + w * t)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${ch(pa[0], pb[0])}${ch(pa[1], pb[1])}${ch(pa[2], pb[2])}`
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** WCAG relative luminance of a `#RRGGBB` color, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = parseHex(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Parse a `#RGB` / `#RGBA` / `#RRGGBB` / `#RRGGBBAA` color into `{r,g,b}`.
 * Returns `undefined` for anything that is not a valid hex color. Mirrors
 * Cursor's own `parseHexColor` (3/4-digit forms are expanded).
 */
export function parseHexColor(hex: string): { r: number; g: number; b: number } | undefined {
  const n = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]+$/.test(n)) return undefined
  let r: string
  let g: string
  let b: string
  if (n.length === 3 || n.length === 4) {
    r = n.charAt(0) + n.charAt(0)
    g = n.charAt(1) + n.charAt(1)
    b = n.charAt(2) + n.charAt(2)
  } else if (n.length === 6 || n.length === 8) {
    r = n.slice(0, 2)
    g = n.slice(2, 4)
    b = n.slice(4, 6)
  } else {
    return undefined
  }
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) }
}

/** Cursor core theme base foregrounds. */
export const BASE_DARK = '#F0F0F0'
export const BASE_LIGHT = '#141414'
/** On-accent foregrounds chosen by Cursor's BT.601 brightness test. */
export const ON_ACCENT_DARK = '#191C22'
export const ON_ACCENT_LIGHT = '#FFFFFF'
/** BT.601 luma weights + the brightness threshold for picking on-accent text. */
const BT601_RED_WEIGHT = 299
const BT601_GREEN_WEIGHT = 587
const BT601_BLUE_WEIGHT = 114
const ON_ACCENT_BRIGHTNESS_THRESHOLD = 150

/** Category hues (Cursor core `--cursor-{hue}`; `pink` maps to Cursor `magenta`). */
export const CATEGORY_DARK = {
  gray: '#F0F0F099', // = canvasPaletteDark.foregroundTertiary (mixTransparent base 60%)
  purple: '#9386F2',
  green: '#3FA266',
  yellow: '#F1B467',
  cyan: '#81A1C1',
  pink: '#B48EAD',
  blue: '#7BAFE9',
  orange: '#DD7F76',
  red: '#FC6B83',
} as const

export const CATEGORY_LIGHT = {
  gray: '#14141499', // = canvasPaletteLight.foregroundTertiary
  purple: '#7565CC',
  green: '#007041',
  yellow: '#A46700',
  cyan: '#176C74',
  pink: '#92156A',
  blue: '#2778C1',
  orange: '#C93714',
  red: '#BE1744',
} as const

export type Color =
  | 'gray'
  | 'purple'
  | 'green'
  | 'yellow'
  | 'cyan'
  | 'pink'
  | 'blue'
  | 'orange'
  | 'red'

export type CategoryPalette = Readonly<Record<Color, string>>

export const categoryPaletteDark: CategoryPalette = CATEGORY_DARK
export const categoryPaletteLight: CategoryPalette = CATEGORY_LIGHT
/** Legacy name kept for back-compat; React consumers should read `useHostTheme().category`. */
export const colorPalette: CategoryPalette = CATEGORY_DARK

/**
 * Auto-color rotation for `UsageBar` segments without an explicit `color`.
 * Matches Cursor's canonical category order (gray first, then the hue families).
 */
export const usageColorSequence: readonly Color[] = [
  'gray',
  'purple',
  'green',
  'yellow',
  'cyan',
  'pink',
  'blue',
  'orange',
  'red',
]

/** Flat palette — the 24 surface/text/fill/stroke/accent/diff entries. */
export interface CanvasPalette {
  readonly foreground: string
  readonly foregroundSecondary: string
  readonly foregroundTertiary: string
  readonly foregroundQuaternary: string
  readonly editor: string
  readonly chrome: string
  readonly sidebar: string
  readonly elevated: string
  readonly fillPrimary: string
  readonly fillSecondary: string
  readonly fillTertiary: string
  readonly fillQuaternary: string
  readonly strokePrimary: string
  readonly strokeSecondary: string
  readonly strokeTertiary: string
  readonly strokeFocused: string
  readonly accent: string
  readonly buttonBackground: string
  readonly buttonForeground: string
  readonly buttonHoverBackground: string
  readonly link: string
  readonly diffInsertedLine: string
  readonly diffRemovedLine: string
  readonly diffStripAdded: string
  readonly diffStripRemoved: string
}

/** Semantic color groups consumed by components. */
export interface CanvasTokens {
  bg: { editor: string; chrome: string; elevated: string }
  text: {
    primary: string
    secondary: string
    tertiary: string
    quaternary: string
    link: string
    onAccent: string
  }
  stroke: { primary: string; secondary: string; tertiary: string; focused: string }
  fill: { primary: string; secondary: string; tertiary: string; quaternary: string }
  accent: { primary: string; control: string; controlHover: string }
  diff: {
    insertedLine: string
    removedLine: string
    stripAdded: string
    stripRemoved: string
  }
  category: CategoryPalette
}

/** Pinned Cursor dark palette (cursor-core dark theme). */
export const canvasPaletteDark: CanvasPalette = {
  foreground: '#F0F0F0',
  foregroundSecondary: '#F0F0F0BD',
  foregroundTertiary: '#F0F0F099',
  foregroundQuaternary: '#F0F0F05C',
  editor: '#181818',
  chrome: '#141414',
  sidebar: '#181818',
  elevated: '#181818',
  fillPrimary: '#F0F0F033',
  fillSecondary: '#F0F0F024',
  fillTertiary: '#F0F0F014',
  fillQuaternary: '#F0F0F00F',
  strokePrimary: '#F0F0F033',
  strokeSecondary: '#F0F0F01F',
  strokeTertiary: '#F0F0F014',
  strokeFocused: '#F0F0F0',
  accent: '#599CE7',
  buttonBackground: '#599CE7',
  buttonForeground: ON_ACCENT_DARK,
  buttonHoverBackground: '#68A4E8',
  link: '#7BAFE9',
  diffInsertedLine: '#3FA26633',
  diffRemovedLine: '#B8004933',
  diffStripAdded: '#3FA2668F',
  diffStripRemoved: '#FC6B838F',
}

/** Pinned Cursor light palette (cursor-core light theme). */
export const canvasPaletteLight: CanvasPalette = {
  foreground: '#141414',
  foregroundSecondary: '#141414BD',
  foregroundTertiary: '#14141499',
  foregroundQuaternary: '#1414145C',
  editor: '#FCFCFC',
  chrome: '#F8F8F8',
  sidebar: '#F3F3F3',
  elevated: '#FCFCFC',
  fillPrimary: '#14141433',
  fillSecondary: '#14141424',
  fillTertiary: '#14141414',
  fillQuaternary: '#1414140F',
  strokePrimary: '#14141433',
  strokeSecondary: '#1414141F',
  strokeTertiary: '#14141414',
  strokeFocused: '#2778C1',
  accent: '#2778C1',
  buttonBackground: '#2778C1',
  buttonForeground: ON_ACCENT_LIGHT,
  buttonHoverBackground: '#256EB0',
  link: '#2778C1',
  diffInsertedLine: '#00AF6624',
  diffRemovedLine: '#FF617B38',
  diffStripAdded: '#007041CC',
  diffStripRemoved: '#BE1744CC',
}

function buildTokens(palette: CanvasPalette, category: CategoryPalette): CanvasTokens {
  return {
    bg: { editor: palette.editor, chrome: palette.chrome, elevated: palette.elevated },
    text: {
      primary: palette.foreground,
      secondary: palette.foregroundSecondary,
      tertiary: palette.foregroundTertiary,
      quaternary: palette.foregroundQuaternary,
      link: palette.link,
      onAccent: palette.buttonForeground,
    },
    stroke: {
      primary: palette.strokePrimary,
      secondary: palette.strokeSecondary,
      tertiary: palette.strokeTertiary,
      focused: palette.strokeFocused,
    },
    fill: {
      primary: palette.fillPrimary,
      secondary: palette.fillSecondary,
      tertiary: palette.fillTertiary,
      quaternary: palette.fillQuaternary,
    },
    accent: {
      primary: palette.accent,
      control: palette.buttonBackground,
      controlHover: palette.buttonHoverBackground,
    },
    diff: {
      insertedLine: palette.diffInsertedLine,
      removedLine: palette.diffRemovedLine,
      stripAdded: palette.diffStripAdded,
      stripRemoved: palette.diffStripRemoved,
    },
    category,
  }
}

export const canvasTokens: CanvasTokens = buildTokens(
  canvasPaletteDark,
  categoryPaletteDark,
)
export const canvasTokensLight: CanvasTokens = buildTokens(
  canvasPaletteLight,
  categoryPaletteLight,
)

export interface CanvasHostThemeOverrides {
  readonly primary?: string
  readonly editorBackground?: string
  readonly editorForeground?: string
}

/**
 * Overlay a host-provided primary/accent color onto a base palette. Only the
 * accent-adjacent entries change (accent, button background/hover, focus
 * stroke, links) plus a BT.601-luminance-picked on-accent foreground. Mirrors
 * Cursor's `applyPrimaryColor` exactly: `buttonHoverBackground` is set to the
 * primary itself, not a blended value.
 */
export function applyPrimaryColor(palette: CanvasPalette, primary: string): CanvasPalette {
  const c = parseHexColor(primary)
  if (!c) return palette
  const luma = (c.r * BT601_RED_WEIGHT + c.g * BT601_GREEN_WEIGHT + c.b * BT601_BLUE_WEIGHT) / 1000
  const onAccent = luma > ON_ACCENT_BRIGHTNESS_THRESHOLD ? ON_ACCENT_DARK : ON_ACCENT_LIGHT
  return {
    ...palette,
    accent: primary,
    buttonBackground: primary,
    buttonHoverBackground: primary,
    strokeFocused: primary,
    link: primary,
    buttonForeground: onAccent,
  }
}

/**
 * Overlay workbench editor surface colors onto the base palette. Mirrors
 * Cursor exactly: `editor`/`chrome`/`elevated` follow `editorBackground`,
 * `foreground` follows `editorForeground`, and `sidebar` is left untouched.
 */
export function applyWorkbenchSurfaces(
  palette: CanvasPalette,
  surfaces: Pick<CanvasHostThemeOverrides, 'editorBackground' | 'editorForeground'>,
): CanvasPalette {
  let result = palette
  if (surfaces.editorBackground && parseHexColor(surfaces.editorBackground) !== undefined) {
    result = {
      ...result,
      editor: surfaces.editorBackground,
      chrome: surfaces.editorBackground,
      elevated: surfaces.editorBackground,
    }
  }
  if (surfaces.editorForeground && parseHexColor(surfaces.editorForeground) !== undefined) {
    result = { ...result, foreground: surfaces.editorForeground }
  }
  return result
}

/**
 * Resolve the full token set for a host theme `kind`, optionally overlaying
 * workbench surfaces and the active editor's primary/accent color. Light kinds
 * (`light`, `hc-light`) use the light palette/categories; every other kind
 * uses the dark ones.
 */
export function buildHostTokens(
  kind: string,
  overrides?: CanvasHostThemeOverrides,
): { tokens: CanvasTokens; palette: CanvasPalette } {
  const light = kind === 'light' || kind === 'hc-light'
  const surfaces: { editorBackground?: string; editorForeground?: string } = {}
  if (overrides?.editorBackground) surfaces.editorBackground = overrides.editorBackground
  if (overrides?.editorForeground) surfaces.editorForeground = overrides.editorForeground
  let palette = applyWorkbenchSurfaces(light ? canvasPaletteLight : canvasPaletteDark, surfaces)
  if (overrides?.primary) {
    palette = applyPrimaryColor(palette, overrides.primary)
  }
  const tokens = buildTokens(palette, light ? categoryPaletteLight : categoryPaletteDark)
  return { tokens, palette }
}

/**
 * Chart color palette — pinned Cursor copies, 88% opacity (E0) softens
 * vibrancy without dulling; maximizes hue + luminosity spread.
 */
export const chartPalette = {
  green: '#1F8A65E8',
  darkGreen: '#0D855AE0',
  lightGreen: '#52B896E0',
  mintGreen: '#7DCAB0E0',
  blue: '#2E79B5E0',
  lightBlue: '#70B0D8E0',
  indigo: '#5A6CC0F0',
  lightIndigo: '#9AAADCE0',
  purple: '#7B64B8F0',
  lightPurple: '#AA98D8E0',
  warmPink: '#C85898E0',
  lightPink: '#E8A0C4E0',
  brightOrange: '#F0A040E0',
  deepOrange: '#C06028E0',
  goldenYellow: '#E8C030E0',
  darkAmber: '#C04848E0',
  warmPeach: '#F0A088E0',
  vibrantTeal: '#2A9A8AE0',
  muted: '#8888A8E0',
  neutralLine: '#888899D0',
} as const

/** Ordered array for automatic series coloring — Cursor's exact rotation. */
export const chartColorSequence: readonly string[] = [
  chartPalette.green,
  chartPalette.lightBlue,
  chartPalette.indigo,
  chartPalette.brightOrange,
  chartPalette.deepOrange,
  chartPalette.goldenYellow,
  chartPalette.warmPink,
  chartPalette.warmPeach,
  chartPalette.purple,
  chartPalette.mintGreen,
  chartPalette.muted,
  chartPalette.vibrantTeal,
]

/**
 * Shared semantic tone colors — the single `toneToColor` mapping Cursor uses
 * across Stat, Pill, Table, Callout, and all charts. Maps to chart palette
 * entries, not category hues.
 */
export const toneColors = {
  success: chartPalette.lightGreen,
  danger: chartPalette.darkAmber,
  warning: chartPalette.brightOrange,
  info: chartPalette.lightBlue,
  neutral: chartPalette.muted,
} as const

export type Tone = keyof typeof toneColors
