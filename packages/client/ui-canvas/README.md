---
description: "Themed React Canvas components for dsh web surfaces: charts, forms, primitives, and host-state hooks that mirror the Cursor canvas SDK inside a sandboxed iframe (zero Cordis)."
kind: "package-library"
---

# @deepseek-ai/dsh-client-ui-canvas

English | [中文](README.zh.md)

## Summary

Compose Canvas-style React surfaces — bar, line, and pie charts, form controls, layout primitives, DAG layout, diff views, and todo cards — with design tokens that follow the host theme. The hooks read an optional `window.__dshCanvas` / `window.__cursorCanvas` bridge and fall back to `prefers-color-scheme`, `localStorage`, and `postMessage`, so a sandboxed iframe works with or without the bridge. Consumers import the package directly as a dependency; it registers nothing into a Cordis composition and ships inline-style tokens only.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

### When to use it

Reach for it when a dsh web surface renders Canvas-plugin content and needs the shared palette, charts, and form atoms under one token set. Plain surfaces that only need controls, icons, and markdown rendering use `@deepseek-ai/dsh-client-ui-primitives` instead.

### Entry point

```ts
import { BarChart, Card, useHostTheme } from '@deepseek-ai/dsh-client-ui-canvas'

function Panel() {
  const theme = useHostTheme()
  return (
    <Card>
      <BarChart data={[{ label: 'a', value: 1 }]} />
    </Card>
  )
}
```

Components render with inline-style tokens from the resolved host theme; without a host bridge `useHostTheme` falls back to `prefers-color-scheme`. The public surface is re-exported from `src/index.ts`: `tokens`, `charts` (`BarChart`, `LineChart`, `PieChart`), `forms` (`Checkbox`, `IconButton`, `Select`, `TextArea`, `TextInput`, `Toggle`), `primitives` (`Button`, `Callout`, `Card`, `Grid`, `Stack`, `Table`, and more), `extras` (`CollapsibleSection`, `computeDAGLayout`, `DiffStats`, `DiffView`, `Swatch`, `TodoList`, `UsageBar`), and the hooks `useCanvasAction`, `useCanvasState`, `useHostTheme`.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The theme layer normalizes an unknown host-bridge payload into `CanvasTokens` through `buildHostTokens`, defaulting every field so partial bridges still render. Styles are inline (`mergeStyle`), keeping the package free of CSS pipelines; the bundle face compiles through the static-linked channel with no closure factory. Source map:

| Source | Role |
| --- | --- |
| [`src/tokens.ts`](src/tokens.ts) | Palette and token construction from the host theme |
| [`src/hooks.ts`](src/hooks.ts) | Bridge reading, fallbacks, and host-state hooks |
| [`src/charts.tsx`](src/charts.tsx) | Bar, line, and pie chart components |
| [`src/forms.tsx`](src/forms.tsx) | Checkbox, IconButton, Select, TextArea, TextInput, Toggle |
| [`src/primitives.tsx`](src/primitives.tsx) | Layout, typography, card, and table atoms |
| [`src/extras.tsx`](src/extras.tsx) | DAG layout, diff view, todo cards, usage bars, swatches |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-primitives](../ui-primitives/README.md) — the shared non-Canvas UI atoms.
- [ui-theme](../ui-theme/README.md) — the brand font and theme token layer.
- [Client packages map](../../README.md) — how the client surface composes.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package renders host-provided content as React components and registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Bridge optional but shallow** — unknown host-bridge fields are defaulted, not merged per component; a host wanting different component-level defaults must provide its own wrappers.
- **Inline styles only** — theming flows through style objects and design tokens; there is no stylesheet output, so host-side CSS overrides cannot restyle components without wrapping them.
- **Charts are canvas-light** — `BarChart`, `LineChart`, and `PieChart` render bounded datasets for panel use; large-series interactive charting is out of scope.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
