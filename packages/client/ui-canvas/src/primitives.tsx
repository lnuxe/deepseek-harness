/**
 * UI primitives for the canvas SDK — layout, typography, surfaces, and actions.
 * All styling comes from `useHostTheme()` tokens; no gradients, no shadows, no
 * hardcoded hex (semantic tones use the shared category/chart palette).
 */
import { createContext, useCallback, useContext, useState } from 'react'
import type { CSSProperties, ReactNode, JSX } from 'react'
import { useHostTheme } from './hooks.js'
import { canvasRadius, canvasTypography } from './theme.js'
import { toneColors } from './tokens.js'

/** Canonical monospace stack Cursor uses for code/diff surfaces. */
const mono =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'

/** Font-weight map — note `bold` is 650, matching Cursor's pin. */
const textWeightMap: Record<TextWeight, number> = {
  normal: 400,
  medium: 500,
  semibold: 590,
  bold: 650,
}

/**
 * Tracks whether a `Text` is nested inside another typography element (H1/H2/H3
 * or another `Text`). When true, `Text` renders a `<span>` instead of a `<p>`,
 * matching Cursor's auto-inline behavior.
 */
const typographyInlineContext = createContext(false)

// ── Callout tone icons (Cursor `@anysphere/ui` toast glyphs, 300px viewbox) ──
const CALLOUT_ICON_VIEWBOX = 300
const CALLOUT_TONE_ICON_PX = 12
const CALLOUT_ICON_GLYPH_TRANSFORM = `matrix(1 0 0 -1 0 ${CALLOUT_ICON_VIEWBOX})`
const NEUTRAL_FILLED_CIRCLE_RADIUS = 132
const NEUTRAL_FILLED_CIRCLE_CENTER = CALLOUT_ICON_VIEWBOX / 2

type CalloutToneIconGlyph = 'info' | 'warning' | 'circles-check' | 'exclamation-circle'
type CalloutToneForIcon = 'info' | 'success' | 'warning' | 'danger' | 'neutral'
const calloutToneIconGlyph: Record<Exclude<CalloutToneForIcon, 'neutral'>, CalloutToneIconGlyph> = {
  info: 'info',
  success: 'circles-check',
  warning: 'warning',
  danger: 'exclamation-circle',
}
const calloutToneIconPaths: Record<CalloutToneIconGlyph, string> = {
  info: 'M150 293Q189 293 222.0 274.0Q255 255 274.0 222.0Q293 189 293.0 150.0Q293 111 274.0 78.0Q255 45 222.0 26.0Q189 7 150.0 7.0Q111 7 78.0 26.0Q45 45 26.0 78.0Q7 111 7.0 150.0Q7 189 26.0 222.0Q45 255 78.0 274.0Q111 293 150 293ZM150 270Q118 270 90.5 253.5Q63 237 46.5 209.5Q30 182 30.0 150.0Q30 118 46.5 90.5Q63 63 90.5 46.5Q118 30 150.0 30.0Q182 30 209.5 46.5Q237 63 253.5 90.5Q270 118 270.0 150.0Q270 182 253.5 209.5Q237 237 209.5 253.5Q182 270 150 270ZM150 152Q155 152 158.5 148.5Q162 145 162 141V94Q162 89 158.5 85.5Q155 82 150.0 82.0Q145 82 141.5 85.5Q138 89 138 94V141Q138 145 141.5 148.5Q145 152 150 152ZM150 216Q158 216 163.5 210.5Q169 205 169.0 197.0Q169 189 163.5 183.5Q158 178 150.0 178.0Q142 178 136.5 183.5Q131 189 131.0 197.0Q131 205 136.5 210.5Q142 216 150 216Z',
  warning:
    'M116 268Q123 281 136.5 286.0Q150 291 163.5 286.0Q177 281 185 268L290 86Q298 73 295.0 59.0Q292 45 281.0 35.5Q270 26 256 26H44Q30 26 19.0 35.5Q8 45 5.0 59.0Q2 73 10 86ZM164 257Q159 265 150.0 265.0Q141 265 136 257L30 74Q26 66 30.5 57.5Q35 49 44 49H256Q265 49 269.5 57.5Q274 66 270 74ZM150 113Q158 113 163.5 107.5Q169 102 169.0 94.0Q169 86 163.5 80.5Q158 75 150.0 75.0Q142 75 136.5 80.5Q131 86 131.0 94.0Q131 102 136.5 107.5Q142 113 150 113ZM150 209Q155 209 158.5 205.5Q162 202 162 197V150Q162 145 158.5 141.5Q155 138 150.0 138.0Q145 138 141.5 141.5Q138 145 138 150V197Q138 202 141.5 205.5Q145 209 150 209Z',
  'circles-check':
    'M117 227Q147 227 172.5 212.5Q198 198 212.5 172.5Q227 147 227.0 117.0Q227 87 212.5 62.0Q198 37 172.5 22.0Q147 7 117.0 7.0Q87 7 62.0 22.0Q37 37 22.0 62.0Q7 87 7.0 117.0Q7 147 22.0 172.5Q37 198 62.0 212.5Q87 227 117 227ZM117 204Q94 204 74.0 192.5Q54 181 42.0 161.0Q30 141 30.0 117.5Q30 94 42.0 74.0Q54 54 74.0 42.0Q94 30 117.5 30.0Q141 30 161.0 42.0Q181 54 192.5 74.0Q204 94 204.0 117.5Q204 141 192.5 161.0Q181 181 161.0 192.5Q141 204 117 204ZM146 144Q150 148 155.0 148.0Q160 148 163.0 144.5Q166 141 166.0 136.0Q166 131 163 128L123 87Q117 81 108.0 81.0Q99 81 93 87L71 109Q68 112 68.0 117.0Q68 122 71.5 125.5Q75 129 80.0 129.0Q85 129 88 125L108 106ZM128 278Q160 297 197.0 292.0Q234 287 260.5 260.5Q287 234 292.0 197.0Q297 160 278 128Q276 124 271.0 122.5Q266 121 262.0 123.5Q258 126 256.5 130.5Q255 135 258 139Q273 165 269.0 194.0Q265 223 244.0 244.0Q223 265 194.0 269.0Q165 273 139 258Q135 255 130.5 256.5Q126 258 123.5 262.0Q121 266 122.5 271.0Q124 276 128 278Z',
  'exclamation-circle':
    'M150 293Q189 293 222.0 274.0Q255 255 274.0 222.0Q293 189 293.0 150.0Q293 111 274.0 78.0Q255 45 222.0 26.0Q189 7 150.0 7.0Q111 7 78.0 26.0Q45 45 26.0 78.0Q7 111 7.0 150.0Q7 189 26.0 222.0Q45 255 78.0 274.0Q111 293 150 293ZM150 270Q118 270 90.5 253.5Q63 237 46.5 209.5Q30 182 30.0 150.0Q30 118 46.5 90.5Q63 63 90.5 46.5Q118 30 150.0 30.0Q182 30 209.5 46.5Q237 63 253.5 90.5Q270 118 270.0 150.0Q270 182 253.5 209.5Q237 237 209.5 253.5Q182 270 150 270ZM150 113Q158 113 163.5 107.5Q169 102 169.0 94.0Q169 86 163.5 80.5Q158 75 150.0 75.0Q142 75 136.5 80.5Q131 86 131.0 94.0Q131 102 136.5 107.5Q142 113 150 113ZM150 227Q155 227 158.5 223.5Q162 220 162 216V150Q162 145 158.5 141.5Q155 138 150.0 138.0Q145 138 141.5 141.5Q138 145 138 150V216Q138 220 141.5 223.5Q145 227 150 227Z',
}

function CalloutToneIcon({ tone, color }: { tone: CalloutToneForIcon; color: string }): JSX.Element {
  return (
    <svg
      width={CALLOUT_TONE_ICON_PX}
      height={CALLOUT_TONE_ICON_PX}
      viewBox={`0 0 ${CALLOUT_ICON_VIEWBOX} ${CALLOUT_ICON_VIEWBOX}`}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, color }}
    >
      {tone === 'neutral' ? (
        <circle
          cx={NEUTRAL_FILLED_CIRCLE_CENTER}
          cy={NEUTRAL_FILLED_CIRCLE_CENTER}
          r={NEUTRAL_FILLED_CIRCLE_RADIUS}
          fill="currentColor"
        />
      ) : (
        <g transform={CALLOUT_ICON_GLYPH_TRANSFORM}>
          <path fill="currentColor" d={calloutToneIconPaths[calloutToneIconGlyph[tone]]} />
        </g>
      )}
    </svg>
  )
}

/** Shallow-merge two style objects with `override` taking precedence. */
export function mergeStyle(base: CSSProperties, override?: CSSProperties): CSSProperties {
  return override ? { ...base, ...override } : base
}

// ── Layout ──────────────────────────────────────────────────────────────────

export type StackProps = { children?: ReactNode; gap?: number; style?: CSSProperties }
export function Stack({ children, gap = 12, style }: StackProps): JSX.Element {
  return (
    <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: `${gap}px`, width: '100%' }, style)}>
      {children}
    </div>
  )
}

export type RowProps = {
  children?: ReactNode
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'space-between'
  wrap?: boolean
  style?: CSSProperties
}
export function Row({
  children,
  gap = 8,
  align = 'center',
  justify = 'start',
  wrap = false,
  style,
}: RowProps): JSX.Element {
  return (
    <div
      style={mergeStyle(
        {
          display: 'flex',
          flexDirection: 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          alignItems: align,
          justifyContent: justify,
          gap: `${gap}px`,
          width: '100%',
        },
        style,
      )}
    >
      {children}
    </div>
  )
}

export type GridProps = {
  children?: ReactNode
  columns: number | string
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  style?: CSSProperties
}
export function Grid({ children, columns, gap = 12, align = 'stretch', style }: GridProps): JSX.Element {
  const template = typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns
  return (
    <div
      style={mergeStyle(
        { display: 'grid', gridTemplateColumns: template, gap: `${gap}px`, alignItems: align, width: '100%' },
        style,
      )}
    >
      {children}
    </div>
  )
}

export function Spacer(): JSX.Element {
  return <div style={{ flex: '1 1 auto' }} />
}

export type DividerProps = { style?: CSSProperties }
export function Divider({ style }: DividerProps): JSX.Element {
  const theme = useHostTheme()
  return (
    <hr style={mergeStyle({ width: '100%', border: 'none', borderTop: `1px solid ${theme.stroke.tertiary}`, margin: 0 }, style)} />
  )
}

// ── Typography ──────────────────────────────────────────────────────────────

export type H1Props = { children?: ReactNode; style?: CSSProperties }
export function H1({ children, style }: H1Props): JSX.Element {
  const theme = useHostTheme()
  return (
    <typographyInlineContext.Provider value={true}>
      <h1
        style={mergeStyle(
          { ...canvasTypography.h1, color: theme.text.primary, margin: 0 },
          style,
        )}
      >
        {children}
      </h1>
    </typographyInlineContext.Provider>
  )
}

export type H2Props = { children?: ReactNode; style?: CSSProperties }
export function H2({ children, style }: H2Props): JSX.Element {
  const theme = useHostTheme()
  return (
    <typographyInlineContext.Provider value={true}>
      <h2
        style={mergeStyle(
          { ...canvasTypography.h2, color: theme.text.primary, margin: 0 },
          style,
        )}
      >
        {children}
      </h2>
    </typographyInlineContext.Provider>
  )
}

export type H3Props = { children?: ReactNode; style?: CSSProperties }
export function H3({ children, style }: H3Props): JSX.Element {
  const theme = useHostTheme()
  return (
    <typographyInlineContext.Provider value={true}>
      <h3
        style={mergeStyle(
          { ...canvasTypography.h3, color: theme.text.primary, margin: 0 },
          style,
        )}
      >
        {children}
      </h3>
    </typographyInlineContext.Provider>
  )
}

export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold'

export type TextProps = {
  children?: ReactNode
  tone?: 'primary' | 'secondary' | 'tertiary' | 'quaternary'
  size?: 'body' | 'small'
  as?: 'p' | 'span'
  weight?: TextWeight
  italic?: boolean
  truncate?: boolean | 'start' | 'end'
  style?: CSSProperties
}
export function Text({
  children,
  tone = 'primary',
  size = 'body',
  as,
  weight = 'normal',
  italic = false,
  truncate = false,
  style,
}: TextProps): JSX.Element {
  const theme = useHostTheme()
  const inline = useContext(typographyInlineContext)
  const Tag = as ?? (inline ? 'span' : 'p')
  const toneColor = {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    tertiary: theme.text.tertiary,
    quaternary: theme.text.quaternary,
  }[tone]
  const preset = size === 'small' ? canvasTypography.small : canvasTypography.body
  const direction = truncate === true ? 'end' : truncate === false ? null : truncate
  const truncateStyle: CSSProperties =
    direction !== null
      ? {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...(Tag === 'span' ? { display: 'inline-block', maxWidth: '100%' } : {}),
        ...(direction === 'start' ? { direction: 'rtl', textAlign: 'left' } : {}),
      }
      : {}
  const inner = direction === 'start' ? <bdi>{children}</bdi> : children
  const base: CSSProperties = {
    margin: 0,
    color: toneColor,
    fontSize: preset.fontSize,
    lineHeight: preset.lineHeight,
    fontWeight: textWeightMap[weight],
    fontStyle: italic ? 'italic' : undefined,
    ...truncateStyle,
  }
  return (
    <typographyInlineContext.Provider value={true}>
      {Tag === 'span' ? (
        <span style={mergeStyle(base, style)}>{inner}</span>
      ) : (
        <p style={mergeStyle(base, style)}>{inner}</p>
      )}
    </typographyInlineContext.Provider>
  )
}

export type CodeProps = { children?: ReactNode; style?: CSSProperties }
export function Code({ children, style }: CodeProps): JSX.Element {
  const theme = useHostTheme()
  return (
    <code
      style={mergeStyle(
        {
          fontFamily: mono,
          fontSize: '0.92em',
          padding: '2px 5px',
          borderRadius: canvasRadius.sm,
          background: theme.fill.quaternary,
          color: theme.text.primary,
        },
        style,
      )}
    >
      {children}
    </code>
  )
}

export type LinkProps = { children?: ReactNode; href: string; style?: CSSProperties }
export function Link({ children, href, style }: LinkProps): JSX.Element {
  const theme = useHostTheme()
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={mergeStyle(
        {
          color: theme.text.link,
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
          textDecorationColor: `${theme.text.link}80`,
        },
        style,
      )}
    >
      {children}
    </a>
  )
}

// ── Surfaces ────────────────────────────────────────────────────────────────

export function CanvasChevron({ expanded }: { expanded: boolean }): JSX.Element {
  const theme = useHostTheme()
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 120ms ease',
        flexShrink: 0,
      }}
    >
      <path d="M4 2.5 7.5 6 4 9.5" stroke={theme.text.tertiary} strokeWidth={1.2} />
    </svg>
  )
}

export type CardSize = 'base' | 'lg'
export type CardVariant = 'default' | 'borderless'
export type CardProps = {
  children?: ReactNode
  variant?: CardVariant
  size?: CardSize
  stickyHeader?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  style?: CSSProperties
}
type CardChrome = {
  size: CardSize
  stickyHeader: boolean
  collapsible: boolean
  isOpen: boolean
  toggle: () => void
}
const CardChromeContext = createContext<CardChrome>({
  size: 'base',
  stickyHeader: false,
  collapsible: false,
  isOpen: true,
  toggle: () => {},
})

export function Card({
  children,
  variant = 'default',
  size = 'base',
  stickyHeader = false,
  collapsible = false,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  style,
}: CardProps): JSX.Element {
  const theme = useHostTheme()
  const controlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlled ? openProp : internalOpen
  const toggle = useCallback(() => {
    if (!collapsible) return
    const next = !isOpen
    if (!controlled) setInternalOpen(next)
    onOpenChange?.(next)
  }, [collapsible, controlled, isOpen, onOpenChange])
  const surface =
    variant === 'default'
      ? { border: `1px solid ${theme.stroke.tertiary}`, borderRadius: canvasRadius.lg }
      : { border: 'none', borderRadius: 0 }
  return (
    <CardChromeContext.Provider value={{ size, stickyHeader, collapsible, isOpen, toggle }}>
      <div
        style={mergeStyle(
          { boxSizing: 'border-box', background: theme.bg.editor, overflow: 'clip', ...surface },
          style,
        )}
      >
        <div style={{ boxSizing: 'border-box', position: 'relative' }}>{children}</div>
      </div>
    </CardChromeContext.Provider>
  )
}

export type CardHeaderProps = {
  children?: ReactNode
  trailing?: ReactNode
  style?: CSSProperties
}
export function CardHeader({ children, trailing, style }: CardHeaderProps): JSX.Element {
  const theme = useHostTheme()
  const { size, stickyHeader, collapsible, isOpen, toggle } = useContext(CardChromeContext)
  const height = size === 'lg' ? 32 : 28
  const hPad = size === 'lg' ? 10 : 8
  const gap = size === 'lg' ? 8 : 6
  const header: CSSProperties = {
    boxSizing: 'border-box',
    ...(stickyHeader
      ? { position: 'sticky', top: 0, zIndex: 5, background: theme.bg.editor }
      : { position: 'relative' }),
    display: 'flex',
    alignItems: 'center',
    height: `${height}px`,
    fontSize: '12px',
    color: theme.text.primary,
    borderBottom: collapsible && !isOpen ? 'none' : `1px solid ${theme.stroke.tertiary}`,
  }
  const content: CSSProperties = {
    boxSizing: 'border-box',
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    padding: `0 ${hPad}px`,
    gap: `${gap}px`,
    overflow: 'hidden',
  }
  const trailingStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingRight: `${hPad}px`,
    flexShrink: 0,
    fontSize: '11px',
    color: theme.text.secondary,
  }
  if (collapsible) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        style={mergeStyle(
          { all: 'unset', ...header, cursor: 'pointer', width: '100%', font: 'inherit', color: 'inherit' },
          style,
        )}
      >
        <div style={content}>
          <CanvasChevron expanded={isOpen} />
          {children}
        </div>
        {trailing != null ? <div style={trailingStyle}>{trailing}</div> : null}
      </button>
    )
  }
  return (
    <div style={mergeStyle(header, style)}>
      <div style={content}>{children}</div>
      {trailing != null ? <div style={trailingStyle}>{trailing}</div> : null}
    </div>
  )
}

export type CardBodyProps = { children?: ReactNode; style?: CSSProperties }
export function CardBody({ children, style }: CardBodyProps): JSX.Element | null {
  const theme = useHostTheme()
  const { collapsible, isOpen } = useContext(CardChromeContext)
  if (collapsible && !isOpen) return null
  return (
    <div
      style={mergeStyle(
        {
          boxSizing: 'border-box',
          padding: '16px',
          fontSize: canvasTypography.small.fontSize,
          lineHeight: canvasTypography.small.lineHeight,
          color: theme.text.secondary,
        },
        style,
      )}
    >
      {children}
    </div>
  )
}

export type StatTone = 'success' | 'danger' | 'warning' | 'info'
export type StatProps = {
  value: ReactNode
  label: string
  tone?: StatTone
  style?: CSSProperties
}
const statToneColors: Record<StatTone, string> = {
  success: toneColors.success,
  danger: toneColors.danger,
  warning: toneColors.warning,
  info: toneColors.info,
}
export function Stat({ value, label, tone, style }: StatProps): JSX.Element {
  const theme = useHostTheme()
  return (
    <div
      style={mergeStyle(
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          padding: '12px 8px',
        },
        style,
      )}
    >
      <div
        style={{
          fontSize: '24px',
          lineHeight: '28px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: tone ? statToneColors[tone] : theme.text.primary,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: canvasTypography.small.fontSize,
          lineHeight: canvasTypography.small.lineHeight,
          color: theme.text.secondary,
        }}
      >
        {label}
      </div>
    </div>
  )
}

export type PillTone =
  | 'neutral'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'success'
  | 'warning'
  | 'info'
export type PillSize = 'sm' | 'md'
export type PillProps = {
  children?: ReactNode
  active?: boolean
  tone?: PillTone
  size?: PillSize
  leadingContent?: ReactNode
  keyboardHint?: string
  disabled?: boolean
  title?: string
  style?: CSSProperties
  onClick?: () => void
}
export function Pill({
  children,
  active = false,
  size = 'md',
  leadingContent,
  keyboardHint,
  disabled = false,
  title,
  style,
  onClick,
}: PillProps): JSX.Element {
  const theme = useHostTheme()
  const clickable = !!onClick
  const sm = size === 'sm'
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    borderRadius: canvasRadius.full,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    fontFamily: 'inherit',
    fontWeight: active ? 500 : 400,
    fontSize: sm ? '10px' : '12px',
    lineHeight: sm ? '12px' : '14px',
    background: sm ? theme.fill.quaternary : active ? theme.fill.secondary : 'transparent',
    color: active ? theme.text.primary : theme.text.secondary,
    border: sm || active ? 'none' : `1px solid ${theme.stroke.secondary}`,
    padding: sm ? '2px 6px' : '6px 10px',
    gap: sm ? '4px' : '6px',
    cursor: clickable ? (disabled ? 'not-allowed' : 'pointer') : 'default',
    opacity: disabled ? 0.3 : 1,
    transition: clickable ? 'color 120ms ease, background 120ms ease' : undefined,
  }
  const content = (
    <>
      {leadingContent ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'inherit' }}>
          {leadingContent}
        </span>
      ) : null}
      <span style={{ flexShrink: 0, color: 'inherit' }}>{children}</span>
      {keyboardHint ? (
        <span style={{ flexShrink: 0, color: theme.text.primary, opacity: 0.3 }}>{keyboardHint}</span>
      ) : null}
    </>
  )
  if (clickable) {
    return (
      <button
        type="button"
        disabled={disabled}
        title={title}
        onClick={disabled ? undefined : onClick}
        style={mergeStyle({ ...base, margin: 0 }, style)}
      >
        {content}
      </button>
    )
  }
  return (
    <span title={title} style={mergeStyle(base, style)}>
      {content}
    </span>
  )
}

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'
export type CalloutProps = {
  children?: ReactNode
  tone?: CalloutTone
  title?: ReactNode
  icon?: ReactNode
  style?: CSSProperties
}
export function Callout({ children, tone = 'info', title, icon, style }: CalloutProps): JSX.Element {
  const theme = useHostTheme()
  const accent = toneColors[tone]
  const lineHeight = canvasTypography.body.lineHeight
  const iconWidth = 16
  const container: CSSProperties = {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    width: '100%',
    color: theme.text.primary,
    fontSize: canvasTypography.body.fontSize,
    fontWeight: canvasTypography.body.fontWeight,
    lineHeight,
  }
  const glyph = icon != null ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, height: lineHeight, minWidth: iconWidth, color: accent }}>
      {icon}
    </span>
  ) : (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, height: lineHeight, width: iconWidth, color: accent }}
      aria-hidden
    >
      <CalloutToneIcon tone={tone} color={accent} />
    </span>
  )
  return (
    <div role="note" style={mergeStyle(container, style)}>
      {glyph}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {title != null ? (
          <div style={{ color: theme.text.primary, fontWeight: 500, fontSize: canvasTypography.body.fontSize, lineHeight }}>
            {title}
          </div>
        ) : null}
        {children != null ? (
          <div
            style={{
              color: theme.text.primary,
              fontSize: canvasTypography.body.fontSize,
              fontWeight: canvasTypography.body.fontWeight,
              lineHeight,
            }}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export type TableColumnAlign = 'left' | 'center' | 'right'
export type TableRowTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'
export type TableProps = {
  headers: ReactNode[]
  rows: ReactNode[][]
  columnAlign?: Array<TableColumnAlign | undefined>
  rowTone?: Array<TableRowTone | undefined>
  framed?: boolean
  striped?: boolean
  stickyHeader?: boolean
  style?: CSSProperties
  emptyMessage?: ReactNode
}
const tableCellPadding: CSSProperties = { padding: '8px 16px' }
const rowToneMarkerColors: Record<TableRowTone, string> = {
  success: toneColors.success,
  danger: toneColors.danger,
  warning: toneColors.warning,
  info: toneColors.info,
  neutral: toneColors.neutral,
}
const rowToneMarkerSizePx = 6
const rowToneMarkerOffsetTopPx =
  (parseInt(canvasTypography.body.lineHeight, 10) - rowToneMarkerSizePx) / 2
function RowToneMarker({ tone }: { tone: TableRowTone }): JSX.Element {
  return (
    <span
      aria-hidden
      style={{
        width: rowToneMarkerSizePx,
        height: rowToneMarkerSizePx,
        marginTop: rowToneMarkerOffsetTopPx,
        borderRadius: '50%',
        background: rowToneMarkerColors[tone],
        flexShrink: 0,
      }}
    />
  )
}
export function Table({
  headers = [],
  rows = [],
  columnAlign,
  rowTone,
  framed = true,
  striped = false,
  stickyHeader = false,
  style,
  emptyMessage = 'No rows.',
}: TableProps): JSX.Element {
  const theme = useHostTheme()
  if (headers.length === 0) {
    return (
      <div style={{ padding: '16px', color: theme.text.secondary, fontSize: canvasTypography.body.fontSize }}>
        Add at least one header.
      </div>
    )
  }
  const cols = headers.length
  const alignOf = (i: number): TableColumnAlign => columnAlign?.[i] ?? 'left'
  const thStyle = (i: number): CSSProperties => ({
    ...tableCellPadding,
    textAlign: alignOf(i),
    fontWeight: 600,
    color: theme.text.primary,
    borderBottom: `1px solid ${theme.stroke.secondary}`,
    ...(stickyHeader
      ? {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        backgroundColor: theme.bg.editor,
        backgroundImage: `linear-gradient(${theme.fill.quaternary}, ${theme.fill.quaternary})`,
      }
      : {}),
  })
  const tdStyle = (i: number): CSSProperties => ({
    ...tableCellPadding,
    textAlign: alignOf(i),
    verticalAlign: 'top',
  })
  const table = (
    <table
      style={mergeStyle(
        {
          minWidth: '100%',
          borderCollapse: stickyHeader ? 'separate' : 'collapse',
          ...(stickyHeader ? { borderSpacing: 0 } : {}),
          tableLayout: 'auto',
          fontSize: canvasTypography.body.fontSize,
          lineHeight: canvasTypography.body.lineHeight,
          color: theme.text.primary,
        },
        style,
      )}
    >
      <thead style={stickyHeader ? undefined : { background: theme.fill.quaternary }}>
        <tr>
          {headers.map((h, i) => (
            <th key={i} scope="col" style={thStyle(i)}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={cols}
              style={mergeStyle(tdStyle(0), {
                color: theme.text.secondary,
                borderBottom: `1px solid ${theme.stroke.tertiary}`,
              })}
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row, ri) => {
            const tone = rowTone?.[ri]
            return (
              <tr
                key={ri}
                style={{
                  ...(ri < rows.length - 1 ? { borderBottom: `1px solid ${theme.stroke.tertiary}` } : {}),
                  ...(striped && ri % 2 === 1 ? { background: theme.fill.quaternary } : {}),
                }}
              >
                {Array.from({ length: cols }, (_, ci) => {
                  const cell = row[ci] ?? null
                  return (
                    <td key={ci} style={tdStyle(ci)}>
                      {tone && ci === 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'flex-start',
                            gap: '6px',
                            minWidth: 0,
                            maxWidth: '100%',
                          }}
                        >
                          <RowToneMarker tone={tone} />
                          <span style={{ minWidth: 0, flex: 1 }}>{cell}</span>
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
  if (!framed) return table
  return (
    <div
      style={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        ...(stickyHeader ? { height: '100%', maxHeight: '100%', minHeight: 0 } : {}),
        border: `1px solid ${theme.stroke.tertiary}`,
        borderRadius: canvasRadius.lg,
        background: theme.bg.editor,
        overflowX: 'auto',
        overflowY: stickyHeader ? 'auto' : 'clip',
      }}
    >
      {table}
    </div>
  )
}

export type ButtonProps = {
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  style?: CSSProperties
  onClick?: () => void
}
export function Button({
  children,
  variant = 'primary',
  disabled = false,
  type = 'button',
  style,
  onClick,
}: ButtonProps): JSX.Element {
  const theme = useHostTheme()
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    height: '24px',
    padding: '0 6px',
    borderRadius: canvasRadius.md,
    fontSize: canvasTypography.body.fontSize,
    lineHeight: canvasTypography.body.lineHeight,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    opacity: disabled ? 0.5 : 1,
    width: 'auto',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    boxSizing: 'border-box',
  }
  const variantStyle: CSSProperties =
    variant === 'primary'
      ? { background: theme.accent.control, color: theme.text.onAccent, borderColor: theme.accent.control }
      : variant === 'secondary'
        ? { background: theme.fill.secondary, color: theme.text.primary, borderColor: theme.stroke.primary }
        : { background: 'transparent', color: theme.text.secondary, borderColor: 'transparent' }
  const transition =
    variant === 'primary' || variant === 'ghost' ? { transition: 'background 120ms ease' } : {}
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={mergeStyle({ ...base, ...variantStyle, ...transition }, style)}
    >
      {children}
    </button>
  )
}
