---
description: "dsh 网页界面的主题化 React Canvas 组件：图表、表单、基础组件与宿主状态钩子，可在沙箱 iframe 中镜像 Cursor canvas SDK（零 Cordis）。"
kind: "package-library"
---

# @deepseek-ai/dsh-client-ui-canvas

[English](README.md) | 中文

## 概述

用跟随宿主主题的设计令牌组装 Canvas 风格的 React 界面——柱状、折线、饼图，表单控件，布局基础组件，DAG 布局，diff 视图与 todo 卡片。各钩子读取可选的 `window.__dshCanvas` / `window.__cursorCanvas` 桥，并回退到 `prefers-color-scheme`、`localStorage` 与 `postMessage`，因此有无桥接的沙箱 iframe 都能工作。使用方以依赖形式直接导入本包；它不向 Cordis 组合注册任何内容，只内置内联样式令牌。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

### 何时使用

当 dsh 网页界面需要渲染 Canvas 插件内容，并要求在统一令牌体系下使用共享配色、图表与表单原子组件时使用本包。只需要控件、图标与 markdown 渲染的普通界面请改用 `@deepseek-ai/dsh-client-ui-primitives`。

### 入口

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

组件以解析出的宿主主题的内联样式令牌渲染；没有宿主桥时 `useHostTheme` 回退到 `prefers-color-scheme`。公开面从 `src/index.ts` 再导出：`tokens`、`charts`（`BarChart`、`LineChart`、`PieChart`）、`forms`（`Checkbox`、`IconButton`、`Select`、`TextArea`、`TextInput`、`Toggle`）、`primitives`（`Button`、`Callout`、`Card`、`Grid`、`Stack`、`Table` 等）、`extras`（`CollapsibleSection`、`computeDAGLayout`、`DiffStats`、`DiffView`、`Swatch`、`TodoList`、`UsageBar`），以及钩子 `useCanvasAction`、`useCanvasState`、`useHostTheme`。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 — 点击展开</summary>

主题层把未知的宿主桥载荷经 `buildHostTokens` 规范化为 `CanvasTokens`，对每个字段都有默认值，因此部分桥接也能渲染。样式全部内联（`mergeStyle`），使本包不依赖 CSS 管线；bundle 面通过 static-linked 通道编译，无闭包工厂。源码地图：

| 源码 | 角色 |
| --- | --- |
| [`src/tokens.ts`](src/tokens.ts) | 从宿主主题构建配色与令牌 |
| [`src/hooks.ts`](src/hooks.ts) | 桥读取、回退与宿主状态钩子 |
| [`src/charts.tsx`](src/charts.tsx) | 柱状、折线、饼图组件 |
| [`src/forms.tsx`](src/forms.tsx) | Checkbox、IconButton、Select、TextArea、TextInput、Toggle |
| [`src/primitives.tsx`](src/primitives.tsx) | 布局、排版、卡片与表格原子组件 |
| [`src/extras.tsx`](src/extras.tsx) | DAG 布局、diff 视图、todo 卡片、用量条、色板 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [ui-primitives](../ui-primitives/README.zh.md) — 共享的非 Canvas UI 原子组件。
- [ui-theme](../ui-theme/README.zh.md) — 品牌字体与主题令牌层。
- [Client 包地图](../../README.zh.md) — client 界面的组合方式。

-----

<a id="model-experience"></a>
## 模型体验

无，本包把宿主提供的内容渲染为 React 组件，不注册任何面向模型的内容。

#### KV 缓存影响

无；本包既不组装也不发送提供者请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **桥可选但浅** — 宿主桥的未知字段按默认值处理，不做组件级合并；宿主要定制组件级默认值需要自行包一层。
- **仅内联样式** — 主题通过样式对象与设计令牌流转；没有样式表产物，宿主侧 CSS 覆盖无法直接改样式，只能包一层组件。
- **图表面向面板** — `BarChart`、`LineChart`、`PieChart` 面向有限数据量的面板渲染；大规模交互式图表不在范围内。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>
