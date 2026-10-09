/**
 * Auxiliary canvas primitives: diff rendering, todo lists, usage bars, swatches,
 * collapsible sections, and pure DAG layout math.
 */
import { useState } from 'react'
import type { CSSProperties, ReactNode, JSX } from 'react'
import { useHostTheme } from './hooks.js'
import { canvasRadius } from './theme.js'
import { mergeStyle, CanvasChevron } from './primitives.js'
import { usageColorSequence } from './tokens.js'
import type { Color } from './tokens.js'

// ── Diff ────────────────────────────────────────────────────────────────────

export type DiffStatsProps = { additions?: number; deletions?: number; style?: CSSProperties }
export function DiffStats({ additions, deletions, style }: DiffStatsProps): JSX.Element | null {
  const theme = useHostTheme()
  if (!additions && !deletions) return null
  return (
    <span style={mergeStyle({ display: 'inline-flex', gap: 8, fontVariantNumeric: 'tabular-nums' }, style)}>
      {additions ? <span style={{ color: theme.category.green, fontSize: 12, fontWeight: 590 }}>+{additions}</span> : null}
      {deletions ? <span style={{ color: theme.category.red, fontSize: 12, fontWeight: 590 }}>-{deletions}</span> : null}
    </span>
  )
}

export type DiffLineType = 'added' | 'removed' | 'unchanged'
export type DiffLineData = { type: DiffLineType; content: string; lineNumber?: number }
export type DiffViewProps = {
  lines: DiffLineData[]
  path?: string
  language?: string
  showLineNumbers?: boolean
  coloredLineNumbers?: boolean
  showAccentStrip?: boolean
  style?: CSSProperties
}
export function DiffView({
  lines,
  showLineNumbers = true,
  coloredLineNumbers = true,
  showAccentStrip = true,
  style,
}: DiffViewProps): JSX.Element {
  const theme = useHostTheme()
  const bg = (t: DiffLineType): string =>
    t === 'added' ? theme.diff.insertedLine : t === 'removed' ? theme.diff.removedLine : 'transparent'
  const strip = (t: DiffLineType): string =>
    t === 'added' ? theme.diff.stripAdded : t === 'removed' ? theme.diff.stripRemoved : 'transparent'
  const numColor = (t: DiffLineType): string =>
    t === 'added' && coloredLineNumbers ? theme.category.green : t === 'removed' && coloredLineNumbers ? theme.category.red : theme.text.quaternary
  return (
    <div style={mergeStyle({ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: '20px' }, style)}>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', background: bg(line.type) }}>
          {showAccentStrip ? <span style={{ width: 3, flexShrink: 0, background: strip(line.type) }} /> : null}
          {showLineNumbers ? (
            <span style={{ width: 44, flexShrink: 0, textAlign: 'right', paddingRight: 8, color: numColor(line.type), userSelect: 'none' }}>
              {line.lineNumber ?? i + 1}
            </span>
          ) : null}
          <span style={{ color: theme.text.primary, whiteSpace: 'pre', paddingRight: 8 }}>
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            {line.content}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Todo ────────────────────────────────────────────────────────────────────

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export interface TodoItem {
  readonly id: string
  readonly content: string
  readonly status: TodoStatus
}
export type TodoListProps = {
  todos: readonly TodoItem[]
  dimmedTodoIds?: ReadonlySet<string>
  onTodoClick?: (todo: TodoItem) => void
  style?: CSSProperties
}

function todoIcon(status: TodoStatus, theme: ReturnType<typeof useHostTheme>): JSX.Element {
  const color =
    status === 'completed'
      ? theme.category.green
      : status === 'in_progress'
        ? theme.category.blue
        : status === 'cancelled'
          ? theme.category.red
          : theme.text.quaternary
  const glyph = status === 'completed' ? '✓' : status === 'cancelled' ? '✕' : status === 'in_progress' ? '◐' : '○'
  return (
    <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 12, flexShrink: 0 }}>
      {glyph}
    </span>
  )
}

export function TodoList({ todos, dimmedTodoIds, onTodoClick, style }: TodoListProps): JSX.Element | null {
  const theme = useHostTheme()
  if (todos.length === 0) return null
  return (
    <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 2 }, style)}>
      {todos.map(todo => (
        <button
          key={todo.id}
          type="button"
          onClick={() => onTodoClick?.(todo)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textAlign: 'left',
            padding: '4px 6px',
            borderRadius: canvasRadius.sm,
            background: 'transparent',
            border: 'none',
            cursor: onTodoClick ? 'pointer' : 'default',
            opacity: dimmedTodoIds?.has(todo.id) ? 0.5 : 1,
            width: '100%',
          }}
        >
          {todoIcon(todo.status, theme)}
          <span
            style={{
              color: theme.text.primary,
              fontSize: 13,
              textDecoration: todo.status === 'cancelled' ? 'line-through' : undefined,
              whiteSpace: 'pre-wrap',
            }}
          >
            {todo.content}
          </span>
        </button>
      ))}
    </div>
  )
}

export type TodoListCardProps = {
  todos: readonly TodoItem[]
  dimmedTodoIds?: ReadonlySet<string>
  defaultExpanded?: boolean
  onTodoClick?: (todo: TodoItem) => void
  style?: CSSProperties
}
export function TodoListCard({
  todos,
  dimmedTodoIds,
  defaultExpanded,
  onTodoClick,
  style,
}: TodoListCardProps): JSX.Element | null {
  const theme = useHostTheme()
  const [open, setOpen] = useState(defaultExpanded ?? false)
  if (todos.length === 0) return null
  const done = todos.filter(t => t.status === 'completed').length
  return (
    <div style={mergeStyle({ border: `1px solid ${theme.stroke.primary}`, borderRadius: canvasRadius.md, overflow: 'hidden' }, style)}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
      >
        <CanvasChevron expanded={open} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 590, color: theme.text.secondary }}>
          {done} of {todos.length} Done
        </span>
      </div>
      {open ? (
        <div style={{ padding: '4px 12px 8px' }}>
          <TodoList
            todos={todos}
            {...(dimmedTodoIds ? { dimmedTodoIds } : {})}
            {...(onTodoClick ? { onTodoClick } : {})}
          />
        </div>
      ) : null}
    </div>
  )
}

// ── UsageBar ────────────────────────────────────────────────────────────────

export interface UsageBarSegment {
  readonly id: string
  readonly value: number
  readonly color?: Color
}
export type UsageBarProps = {
  readonly segments: readonly UsageBarSegment[]
  readonly total: number
  readonly topLeftLabel?: ReactNode
  readonly topRightLabel?: ReactNode
  readonly style?: CSSProperties
}
export function UsageBar({ segments, total, topLeftLabel, topRightLabel, style }: UsageBarProps): JSX.Element {
  const theme = useHostTheme()
  const sum = segments.reduce((acc, s) => acc + (Number.isFinite(s.value) && s.value > 0 ? s.value : 0), 0)
  const remainder = Math.max(0, total - sum)
  return (
    <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 4 }, style)}>
      {topLeftLabel || topRightLabel ? (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: theme.text.secondary }}>{topLeftLabel}</span>
          <span style={{ fontSize: 11, color: theme.text.tertiary }}>{topRightLabel}</span>
        </div>
      ) : null}
      <div style={{ display: 'flex', height: 8, borderRadius: canvasRadius.full, overflow: 'hidden', background: theme.fill.tertiary }}>
        {segments.map((s, i) => {
          const v = Number.isFinite(s.value) && s.value > 0 ? s.value : 0
          const key: Color = s.color ?? (usageColorSequence[i % usageColorSequence.length] ?? 'gray')
          const color = theme.category[key] ?? 'transparent'
          return <span key={s.id} style={{ width: `${(v / total) * 100}%`, background: color, flexShrink: 0 }} />
        })}
        {remainder > 0 ? <span style={{ flex: 1, background: 'transparent' }} /> : null}
      </div>
    </div>
  )
}

// ── Swatch ──────────────────────────────────────────────────────────────────

export type SwatchProps = { color: Color; style?: CSSProperties }
export function Swatch({ color, style }: SwatchProps): JSX.Element {
  const theme = useHostTheme()
  return (
    <span
      style={mergeStyle(
        { width: 24, height: 24, borderRadius: canvasRadius.sm, background: theme.category[color], flexShrink: 0, display: 'inline-block' },
        style,
      )}
    />
  )
}

// ── CollapsibleSection ──────────────────────────────────────────────────────

export type CollapsibleSectionProps = {
  title: string
  leading?: ReactNode
  count?: number
  trailing?: ReactNode
  children?: ReactNode
  defaultOpen?: boolean
  style?: CSSProperties
}
export function CollapsibleSection({
  title,
  leading,
  count,
  trailing,
  children,
  defaultOpen,
  style,
}: CollapsibleSectionProps): JSX.Element {
  const theme = useHostTheme()
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div style={style}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', userSelect: 'none' }}
      >
        <CanvasChevron expanded={open} />
        {leading}
        <span style={{ fontSize: 13, fontWeight: 590, color: theme.text.primary }}>{title}</span>
        {count !== undefined ? <span style={{ fontSize: 11, color: theme.text.tertiary }}>{count}</span> : null}
        <span style={{ flex: 1 }} />
        {trailing}
      </div>
      {open ? <div style={{ paddingLeft: 20 }}>{children}</div> : null}
    </div>
  )
}

// ── DAG layout ──────────────────────────────────────────────────────────────

export type DAGLayoutOptions = {
  nodes: Array<{ id: string }>
  edges: Array<{ from: string; to: string }>
  direction?: 'vertical' | 'horizontal'
  nodeWidth?: number
  nodeHeight?: number
  rankGap?: number
  nodeGap?: number
  padding?: number
}
export type DAGLayoutNode = { id: string; x: number; y: number; rank: number; order: number }
export type DAGLayoutEdge = {
  from: string
  to: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  isBackEdge: boolean
}
export type DAGLayoutRank = { rank: number; x: number; y: number; width: number; height: number; nodeIds: string[] }
export type DAGLayoutResult = {
  nodes: DAGLayoutNode[]
  edges: DAGLayoutEdge[]
  ranks: DAGLayoutRank[]
  direction: 'vertical' | 'horizontal'
  width: number
  height: number
}

export function computeDAGLayout(options: DAGLayoutOptions): DAGLayoutResult {
  const {
    nodes,
    edges,
    direction = 'vertical',
    nodeWidth = 160,
    nodeHeight = 40,
    rankGap = 64,
    nodeGap = 48,
    padding = 24,
  } = options
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  const backEdgeKey = new Set<string>()
  for (const e of edges) {
    if (adj.has(e.from) && adj.has(e.to)) adj.get(e.from)?.push(e.to)
  }
  // Detect back-edges via DFS cycle detection.
  const state = new Map<string, 0 | 1 | 2>()
  const detect = (n: string): void => {
    state.set(n, 1)
    for (const m of adj.get(n) ?? []) {
      const s = state.get(m) ?? 0
      if (s === 1) backEdgeKey.add(`${n}\u0000${m}`)
      else if (s === 0) detect(m)
    }
    state.set(n, 2)
  }
  for (const n of nodes) if ((state.get(n.id) ?? 0) === 0) detect(n.id)

  // Kahn topo + longest-path rank (back-edges excluded).
  const indeg = new Map<string, number>()
  for (const n of nodes) indeg.set(n.id, 0)
  for (const n of nodes) {
    for (const m of adj.get(n.id) ?? []) {
      if (!backEdgeKey.has(`${n.id}\u0000${m}`)) indeg.set(m, (indeg.get(m) ?? 0) + 1)
    }
  }
  const queue = nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id)
  const rank = new Map<string, number>()
  for (const id of queue) rank.set(id, 0)
  while (queue.length) {
    const n = queue.shift()
    if (n === undefined) continue
    for (const m of adj.get(n) ?? []) {
      if (backEdgeKey.has(`${n}\u0000${m}`)) continue
      rank.set(m, Math.max(rank.get(m) ?? 0, (rank.get(n) ?? 0) + 1))
      const next = (indeg.get(m) ?? 0) - 1
      indeg.set(m, next)
      if (next === 0) queue.push(m)
    }
  }
  for (const n of nodes) if (!rank.has(n.id)) rank.set(n.id, 0)

  // Group by rank and assign order.
  const byRank = new Map<number, string[]>()
  for (const n of nodes) {
    const r = rank.get(n.id) ?? 0
    const list = byRank.get(r) ?? []
    list.push(n.id)
    byRank.set(r, list)
  }
  const rankKeys = [...byRank.keys()].sort((a, b) => a - b)
  const orderOf = new Map<string, number>()
  for (const r of rankKeys) (byRank.get(r) ?? []).forEach((id, i) => orderOf.set(id, i))

  const horizontal = direction === 'horizontal'
  const layoutNodes: DAGLayoutNode[] = nodes.map((n) => {
    const r = rank.get(n.id) ?? 0
    const o = orderOf.get(n.id) ?? 0
    const primary = padding + r * (nodeWidth + rankGap)
    const secondary = padding + o * (nodeHeight + nodeGap)
    return { id: n.id, x: horizontal ? secondary : primary, y: horizontal ? primary : secondary, rank: r, order: o }
  })

  const nodeMap = new Map(layoutNodes.map(n => [n.id, n]))
  const layoutEdges: DAGLayoutEdge[] = edges.flatMap((e) => {
    const a = nodeMap.get(e.from)
    const b = nodeMap.get(e.to)
    if (!a || !b) return []
    const isBack = backEdgeKey.has(`${e.from}\u0000${e.to}`)
    const edge: DAGLayoutEdge = horizontal
      ? {
        from: e.from,
        to: e.to,
        sourceX: a.x + nodeWidth / 2,
        sourceY: a.y + nodeHeight,
        targetX: b.x + nodeWidth / 2,
        targetY: b.y,
        isBackEdge: isBack,
      }
      : {
        from: e.from,
        to: e.to,
        sourceX: a.x + nodeWidth,
        sourceY: a.y + nodeHeight / 2,
        targetX: b.x,
        targetY: b.y + nodeHeight / 2,
        isBackEdge: isBack,
      }
    return [edge]
  })

  const ranks: DAGLayoutRank[] = rankKeys.map((r) => {
    const ids = byRank.get(r) ?? []
    const primary = padding + r * (nodeWidth + rankGap)
    const count = Math.max(1, ids.length)
    const secondaryExtent = count * nodeHeight + (count - 1) * nodeGap
    return {
      rank: r,
      x: horizontal ? padding : primary,
      y: horizontal ? primary : padding,
      width: horizontal ? secondaryExtent : nodeWidth,
      height: horizontal ? nodeHeight : secondaryExtent,
      nodeIds: ids,
    }
  })

  const extent = (r: number): number => {
    const count = byRank.get(r)?.length ?? 0
    return count * nodeHeight + Math.max(0, count - 1) * nodeGap
  }
  const width = horizontal
    ? padding * 2 + Math.max(0, rankKeys.length - 1) * (nodeHeight + nodeGap) + nodeHeight
    : padding * 2 + Math.max(0, rankKeys.length - 1) * (nodeWidth + rankGap) + nodeWidth
  const height = padding * 2 + Math.max(0, ...rankKeys.map(extent))

  return { nodes: layoutNodes, edges: layoutEdges, ranks, direction, width, height }
}
