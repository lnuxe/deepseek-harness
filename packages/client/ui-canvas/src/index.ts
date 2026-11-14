/**
 * Public API for `@deepseek-ai/dsh-client-ui-canvas` — the Cursor Canvas SDK
 * equivalent. Mirrors the `cursor/canvas` public surface.
 */
// React authoring utilities (single public import).
export { useEffect, useMemo, useRef, useState } from 'react'
export type { CSSProperties, RefObject } from 'react'

// Shared category palette and design tokens.
export type { CategoryPalette, Color, CanvasPalette, CanvasTokens } from './tokens.js'
export {
  categoryPaletteDark,
  categoryPaletteLight,
  colorPalette,
  usageColorSequence,
  canvasPaletteDark,
  canvasPaletteLight,
  canvasTokens,
  canvasTokensLight,
} from './tokens.js'

// Charts.
export type {
  BarChartProps,
  ChartDataPoint,
  ChartReferenceLine,
  ChartSeries,
  ChartTone,
  LineChartProps,
  PieChartProps,
} from './charts.js'
export { BarChart, LineChart, PieChart } from './charts.js'

// Diff, todo, usage bar, swatch, collapsible section, DAG layout.
export type {
  CollapsibleSectionProps,
  DAGLayoutEdge,
  DAGLayoutNode,
  DAGLayoutOptions,
  DAGLayoutRank,
  DAGLayoutResult,
  DiffLineData,
  DiffLineType,
  DiffStatsProps,
  DiffViewProps,
  SwatchProps,
  TodoItem,
  TodoListCardProps,
  TodoListProps,
  TodoStatus,
  UsageBarProps,
  UsageBarSegment,
} from './extras.js'
export {
  CollapsibleSection,
  computeDAGLayout,
  DiffStats,
  DiffView,
  Swatch,
  TodoList,
  TodoListCard,
  UsageBar,
} from './extras.js'

// Form controls.
export type {
  CheckboxProps,
  IconButtonProps,
  SelectOption,
  SelectProps,
  TextAreaProps,
  TextInputProps,
  ToggleProps,
} from './forms.js'
export { Checkbox, IconButton, Select, TextArea, TextInput, Toggle } from './forms.js'

// Host state hooks.
export type { CanvasAction, CanvasHostTheme, SetCanvasState } from './hooks.js'
export { useCanvasAction, useCanvasState, useHostTheme } from './hooks.js'

// UI primitives (layout, typography, surfaces, actions).
export type {
  ButtonProps,
  CalloutProps,
  CalloutTone,
  CardBodyProps,
  CardHeaderProps,
  CardProps,
  CardSize,
  CardVariant,
  CodeProps,
  DividerProps,
  GridProps,
  H1Props,
  H2Props,
  H3Props,
  LinkProps,
  PillProps,
  PillSize,
  PillTone,
  RowProps,
  StackProps,
  StatProps,
  StatTone,
  TableColumnAlign,
  TableProps,
  TableRowTone,
  TextProps,
  TextWeight,
} from './primitives.js'
export {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Link,
  mergeStyle,
  Pill,
  Row,
  Spacer,
  Stack,
  Stat,
  Table,
  Text,
} from './primitives.js'
