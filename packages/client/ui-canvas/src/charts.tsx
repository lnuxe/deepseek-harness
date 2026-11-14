/**
 * Chart primitives — multi-series, stacked, and pie charts rendered as pure
 * inline SVG with zero external dependencies.
 */
import { useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import { useHostTheme } from './hooks.js'
import { canvasRadius } from './theme.js'
import { mergeStyle } from './primitives.js'
import { chartColorSequence, chartPalette, toneColors } from './tokens.js'

export type ChartTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'
export type ChartDataPoint = { label: string; value: number }
export type ChartSeries = { name: string; data: number[]; tone?: ChartTone }
export type ChartReferenceLine = { value: number; label?: string; tone?: ChartTone }

type ValueAxisProps = {
  beginAtZero?: boolean
  yMin?: number
  yMax?: number
  referenceLines?: ChartReferenceLine[]
}

function toneHex(tone: ChartTone | undefined): string {
  return tone ? (toneColors[tone] ?? '') : ''
}

function seriesColor(i: number, tone: ChartTone | undefined): string {
  if (tone) return toneHex(tone)
  return chartColorSequence[i % chartColorSequence.length] ?? chartPalette.muted
}

function fmt(v: number, prefix?: string, suffix?: string): string {
  const rounded = Number.isInteger(v) ? String(v) : v.toFixed(1)
  return `${prefix ?? ''}${rounded}${suffix ?? ''}`
}

function domain(
  allValues: number[],
  referenceLines: ChartReferenceLine[] | undefined,
  beginAtZero: boolean,
  yMin?: number,
  yMax?: number,
): { min: number; max: number } {
  const refs = referenceLines?.map(r => r.value) ?? []
  const values = [...allValues, ...refs]
  const dataMin = Math.min(0, ...values)
  const dataMax = Math.max(0, ...values)
  const min = yMin ?? (beginAtZero ? Math.min(0, dataMin) : dataMin)
  const max = yMax ?? dataMax
  return { min: max > min ? min : 0, max: max > min ? max : min + 1 }
}

const PAD = { top: 16, right: 12, bottom: 28, left: 44 }

function tickValues(min: number, max: number): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const step = niceStep(span / 4)
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + step / 2; v += step) ticks.push(v)
  return ticks
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / pow
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
  return step * pow
}

// ── BarChart ────────────────────────────────────────────────────────────────

export type BarChartProps = ValueAxisProps & {
  categories: string[]
  series: ChartSeries[]
  height?: number
  stacked?: boolean
  horizontal?: boolean
  normalized?: boolean
  valueSuffix?: string
  valuePrefix?: string
  showValues?: boolean
  style?: CSSProperties
}

export function BarChart({
  categories,
  series,
  height = 240,
  stacked,
  horizontal,
  normalized,
  valueSuffix,
  valuePrefix,
  showValues,
  beginAtZero = true,
  yMin,
  yMax,
  referenceLines,
  style,
}: BarChartProps): JSX.Element {
  const theme = useHostTheme()
  const [hover, setHover] = useState<{ cat: number; ser: number } | null>(null)
  const W = 640
  const H = height
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const isNorm = !!normalized
  const isStacked = !!stacked || isNorm
  const totals = categories.map((_, ci) =>
    isNorm ? series.reduce((sum, s) => sum + Math.max(0, s.data[ci] ?? 0), 0) || 1 : 1,
  )
  const allValues = series.flatMap(s => s.data)
  const d = domain(
    allValues,
    referenceLines,
    beginAtZero,
    isNorm ? undefined : yMin,
    isNorm ? undefined : yMax,
  )
  const dmin = isNorm ? 0 : d.min
  const dmax = isNorm ? 100 : d.max

  const yFor = (v: number) => PAD.top + plotH - ((v - dmin) / (dmax - dmin || 1)) * plotH
  const xFor = (ci: number) => PAD.left + (ci + 0.5) * (plotW / categories.length)
  const groupW = plotW / categories.length
  const ticks = tickValues(dmin, dmax)
  const seriesCount = series.length

  function baseForStacked(ci: number, si: number): number {
    let base = 0
    for (let i = 0; i < si; i++) {
      const raw = series[i]?.data[ci] ?? 0
      base += isNorm ? (raw / (totals[ci] ?? 1)) * 100 : raw
    }
    return base
  }

  function barGeometry(ci: number, si: number, raw: number): { x: number; y: number; w: number; h: number } {
    const v = isNorm ? (raw / (totals[ci] ?? 1)) * 100 : raw
    const base = isStacked ? baseForStacked(ci, si) : 0
    const total = base + v
    if (horizontal) {
      const yGroup = plotH / categories.length
      const barH = seriesCount > 1 ? yGroup / seriesCount : yGroup
      const y = PAD.top + ci * yGroup + (isStacked ? 0 : si * barH) + 1
      const w = ((total - dmin) / (dmax - dmin || 1)) * plotW
      return { x: PAD.left, y, w, h: (isStacked ? yGroup : barH) - 2 }
    }
    const y0 = yFor(Math.max(dmin, Math.min(dmax, isStacked ? base : 0)))
    const y1 = yFor(Math.max(dmin, Math.min(dmax, isStacked ? total : v)))
    const barW = seriesCount > 1 && !isStacked ? groupW / seriesCount : groupW
    const x = PAD.left + ci * groupW + (seriesCount > 1 && !isStacked ? si * barW : 0) + 1
    return { x, y: Math.min(y0, y1), w: barW - 2, h: Math.abs(y1 - y0) }
  }

  return (
    <div style={mergeStyle({ position: 'relative' }, style)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Bar chart">
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(t)} y2={yFor(t)} stroke={theme.stroke.tertiary} strokeWidth={1} />
            <text x={PAD.left - 6} y={yFor(t) + 4} textAnchor="end" fontSize={10} fill={theme.text.tertiary}>
              {fmt(t, valuePrefix, valueSuffix)}
            </text>
          </g>
        ))}
        {referenceLines?.map((r, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(r.value)} y2={yFor(r.value)} stroke={toneHex(r.tone) || theme.text.tertiary} strokeDasharray="4 3" strokeWidth={1} />
            {r.label ? (
              <text x={W - PAD.right} y={yFor(r.value) - 3} textAnchor="end" fontSize={10} fill={toneHex(r.tone) || theme.text.secondary}>
                {r.label}
              </text>
            ) : null}
          </g>
        ))}
        {categories.map((_, ci) =>
          series.map((s, si) => {
            const raw = s.data[ci] ?? 0
            const g = barGeometry(ci, si, raw)
            const color = seriesCount > 1 ? seriesColor(si, s.tone) : seriesColor(ci, s.tone)
            const hovered = hover?.cat === ci && hover?.ser === si
            const showValue = showValues ?? (seriesCount === 1 && categories.length <= 8)
            return (
              <g key={`${ci}-${si}`}>
                <rect
                  x={g.x}
                  y={g.y}
                  width={Math.max(0, g.w)}
                  height={Math.max(0, g.h)}
                  fill={color}
                  rx={2}
                  opacity={hovered ? 1 : hover ? 0.6 : 1}
                  onMouseEnter={() => setHover({ cat: ci, ser: si })}
                  onMouseLeave={() => setHover(null)}
                />
                {showValue && !isStacked && g.h > 12 ? (
                  <text
                    x={horizontal ? g.x + g.w + 4 : g.x + g.w / 2}
                    y={horizontal ? g.y + g.h / 2 + 4 : g.y - 4}
                    textAnchor={horizontal ? 'start' : 'middle'}
                    fontSize={9}
                    fill={theme.text.secondary}
                  >
                    {fmt(raw, valuePrefix, valueSuffix)}
                  </text>
                ) : null}
              </g>
            )
          }),
        )}
        {categories.map((cat, ci) => (
          <text key={cat} x={horizontal ? PAD.left - 6 : xFor(ci)} y={horizontal ? PAD.top + (ci + 0.5) * (plotH / categories.length) + 4 : H - 8} textAnchor={horizontal ? 'end' : 'middle'} fontSize={10} fill={theme.text.tertiary}>
            {cat}
          </text>
        ))}
      </svg>
      {hover ? (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            padding: '4px 8px',
            background: theme.bg.chrome,
            border: `1px solid ${theme.stroke.secondary}`,
            borderRadius: canvasRadius.sm,
            fontSize: 11,
            color: theme.text.primary,
            pointerEvents: 'none',
          }}
        >
          <strong>{categories[hover.cat]}</strong> · {series[hover.ser]?.name}:{' '}
          {fmt(series[hover.ser]?.data[hover.cat] ?? 0, valuePrefix, valueSuffix)}
        </div>
      ) : null}
      {seriesCount > 1 ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {series.map((s, i) => (
            <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.text.secondary }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: seriesColor(i, s.tone) }} />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── LineChart ───────────────────────────────────────────────────────────────

export type LineChartProps = ValueAxisProps & {
  categories: string[]
  series: ChartSeries[]
  height?: number
  fill?: boolean
  valueSuffix?: string
  valuePrefix?: string
  showValues?: boolean
  showHoverGuide?: boolean
  style?: CSSProperties
}

export function LineChart({
  categories,
  series,
  height = 240,
  fill,
  valueSuffix,
  valuePrefix,
  showValues,
  showHoverGuide = true,
  beginAtZero = true,
  yMin,
  yMax,
  referenceLines,
  style,
}: LineChartProps): JSX.Element {
  const theme = useHostTheme()
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = height
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const values = series.flatMap(s => s.data)
  const d = domain(values, referenceLines, beginAtZero, yMin, yMax)
  const xFor = (i: number) => PAD.left + (categories.length === 1 ? 0.5 : i / (categories.length - 1)) * plotW
  const yFor = (v: number) => PAD.top + plotH - ((v - d.min) / (d.max - d.min || 1)) * plotH
  const ticks = tickValues(d.min, d.max)

  return (
    <div style={mergeStyle({ position: 'relative' }, style)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Line chart">
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(t)} y2={yFor(t)} stroke={theme.stroke.tertiary} strokeWidth={1} />
            <text x={PAD.left - 6} y={yFor(t) + 4} textAnchor="end" fontSize={10} fill={theme.text.tertiary}>
              {fmt(t, valuePrefix, valueSuffix)}
            </text>
          </g>
        ))}
        {referenceLines?.map((r, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(r.value)} y2={yFor(r.value)} stroke={toneHex(r.tone) || theme.text.tertiary} strokeDasharray="4 3" strokeWidth={1} />
            {r.label ? (
              <text x={W - PAD.right} y={yFor(r.value) - 3} textAnchor="end" fontSize={10} fill={toneHex(r.tone) || theme.text.secondary}>
                {r.label}
              </text>
            ) : null}
          </g>
        ))}
        {showHoverGuide && hover != null ? (
          <line x1={xFor(hover)} x2={xFor(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke={theme.stroke.secondary} strokeWidth={1} />
        ) : null}
        {series.map((s, si) => {
          const color = seriesColor(si, s.tone)
          const pts = s.data.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ')
          const area = `${xFor(0)},${PAD.top + plotH} ${pts} ${xFor(s.data.length - 1)},${PAD.top + plotH}`
          return (
            <g key={s.name}>
              {fill ? <polygon points={area} fill={color} opacity={0.12} /> : null}
              <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
              {s.data.map((v, i) => (
                <circle
                  key={i}
                  cx={xFor(i)}
                  cy={yFor(v)}
                  r={hover === i ? 4 : 2.5}
                  fill={color}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
              {showValues && s.data.length <= 20
                ? s.data.map((v, i) => (
                  <text key={i} x={xFor(i)} y={yFor(v) - 6} textAnchor="middle" fontSize={9} fill={theme.text.secondary}>
                    {fmt(v, valuePrefix, valueSuffix)}
                  </text>
                ))
                : null}
            </g>
          )
        })}
        {categories.map((cat, i) => (
          <text key={cat} x={xFor(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={theme.text.tertiary}>
            {cat}
          </text>
        ))}
      </svg>
      {hover != null ? (
        <div style={{ position: 'absolute', top: 4, left: 4, padding: '4px 8px', background: theme.bg.chrome, border: `1px solid ${theme.stroke.secondary}`, borderRadius: canvasRadius.sm, fontSize: 11, color: theme.text.primary, pointerEvents: 'none' }}>
          <strong>{categories[hover]}</strong>
          {series.map((s, i) => (
            <div key={s.name}>
              <span style={{ color: seriesColor(i, s.tone) }}>●</span> {s.name}: {fmt(s.data[hover] ?? 0, valuePrefix, valueSuffix)}
            </div>
          ))}
        </div>
      ) : null}
      {series.length > 1 ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {series.map((s, i) => (
            <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.text.secondary }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: seriesColor(i, s.tone) }} />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── PieChart ────────────────────────────────────────────────────────────────

export type PieChartProps = {
  data: Array<ChartDataPoint & { tone?: ChartTone }>
  size?: number
  donut?: boolean
  style?: CSSProperties
}

export function PieChart({ data, size = 200, donut, style }: PieChartProps): JSX.Element {
  const theme = useHostTheme()
  const [hover, setHover] = useState<number | null>(null)
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 2
  const innerR = donut ? outerR * 0.6 : 0

  let angle = -Math.PI / 2
  const slices = data.map((d, i) => {
    const frac = d.value / total
    const a0 = angle
    const a1 = angle + frac * Math.PI * 2
    angle = a1
    const large = a1 - a0 > Math.PI ? 1 : 0
    const color = d.tone ? toneHex(d.tone) : (chartColorSequence[i % chartColorSequence.length] ?? chartPalette.muted)
    const p0 = pt(cx, cy, a0, outerR)
    const p1 = pt(cx, cy, a1, outerR)
    const p2 = pt(cx, cy, a1, innerR)
    const p3 = pt(cx, cy, a0, innerR)
    const path = donut
      ? `M${p0.x},${p0.y} A${outerR},${outerR} 0 ${large} 1 ${p1.x},${p1.y} L${p2.x},${p2.y} A${innerR},${innerR} 0 ${large} 0 ${p3.x},${p3.y} Z`
      : `M${cx},${cy} L${p0.x},${p0.y} A${outerR},${outerR} 0 ${large} 1 ${p1.x},${p1.y} Z`
    return { d, i, path, color }
  })

  return (
    <div style={mergeStyle({ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }, style)}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label="Pie chart">
          {slices.map(({ i, path, color }) => (
            <path
              key={i}
              d={path}
              fill={color}
              opacity={hover === null || hover === i ? 1 : 0.4}
              stroke={theme.bg.elevated}
              strokeWidth={1}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {donut ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 20, fontWeight: 590, color: theme.text.primary }}>{total}</span>
            <span style={{ fontSize: 11, color: theme.text.tertiary }}>total</span>
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.map((d, i) => (
          <span
            key={d.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.text.secondary, cursor: 'default' }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: slices[i]?.color }} />
            {d.label}
            <span style={{ color: theme.text.tertiary }}>{Math.round((d.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function pt(cx: number, cy: number, angle: number, r: number): { x: number; y: number } {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}
