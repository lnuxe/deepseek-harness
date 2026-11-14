---
description: "dsh 配置档的延迟 git-status 提示段：骨架提示立即返回，git 摘要在解析完成后并入，适合在慢仓库会话中使用的用户。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-progressive-injection-bundle

[English](README.md) | 中文

## 概述

为 dsh 配置档添加一个延迟的 `git-status` 提示段：agent 循环立即发出骨架系统提示，并在提供者解析完成后把 git 摘要并入完成的装配结果，因此慢仓库不会拖慢首个 token 的出现。本 bundle 注册一个提示段（`progressive-injection:git-status`），带 `defer: true` 和一个运行 `git rev-parse`、`git status`、`git log` 的异步提供者。没有任何内置配置档包含它；用 `dsh plugin` 添加或移除。底层 git 命令失败时该段渲染为空文本，而不是让装配失败。

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

### 安装进配置档

```text
dsh plugin --profile <name> add @deepseek-ai/dsh-progressive-injection-bundle
dsh plugin --profile <name> remove @deepseek-ai/dsh-progressive-injection-bundle
```

本 bundle 从当前检出目录的 `packages/bundle/progressive-injection` 解析；插件对账步骤通过把 `cordis.patch.yml` 应用到组合后的配置档来激活该层。缺少 patch 声明时安装被拒绝。

### 你会得到

一个名为 `progressive-injection:git-status` 的延迟提示段，慢的 git I/O 永不阻塞首个 token：

| key | 类型 | 默认值 | 含义 |
| --- | --- | --- | --- |
| `cwd` | `string \| null` | `null` | `git` 的工作目录；`null` 回退到 dsh 进程 cwd。 |
| `includeStatus` | `boolean` | `true` | 包含 `git status --porcelain` 变更文件列表。 |
| `includeLastCommit` | `boolean` | `true` | 包含最近一次提交的哈希与标题。 |

编辑 `cordis.patch.yml` 中该行的 `config`（本 bundle 未声明 Config schema，行 `config` 原样透传）：

```yaml
- insert:
    - id: dsh-progressive-injection
      name: '@deepseek-ai/dsh-progressive-injection-bundle'
      config:
        cwd: /path/to/repo
        includeStatus: true
        includeLastCommit: true
```

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 — 点击展开</summary>

patch 文档只有一条 `insert` 行：`id: dsh-progressive-injection`、带 `defer: true` 的提示段，以及它的异步提供者。提供者通过 Host 进程运行 `git rev-parse`、`git status --porcelain`、`git log -1`，agent 循环的渐进装配（骨架优先的准入与每轮缓存）把摘要并入完成的系统提示。源码地图：

| 源码 | 角色 |
| --- | --- |
| [`cordis.patch.yml`](cordis.patch.yml) | 插入的提示段行与默认配置 |
| [`src/index.ts`](src/index.ts) | 延迟提示段提供者与 git 运行器 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Bundle 包地图](../README.zh.md) — 构建在同一核心上的各层。
- [dsh-base](../base/README.zh.md) — 本 bundle 叠加其上的共享核心。

-----

<a id="model-experience"></a>
## 模型体验

间接地，通过插入的延迟提示段——其 git 摘要进入装配后的系统提示，而组合后的配置档与 agent 循环拥有该装配。

#### KV 缓存影响

该段参与每轮渐进装配缓存：骨架提示先于它发出，解析完成后摘要才进入完成的装配，因此等待 git 的那一轮只在解析完成后才把该段文本纳入缓存前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **仅支持 git 数据源** — 该段通过 `git` 读取仓库状态；非 git 目录、缺少 `git`、取消或超时都会把该段渲染为空，而不是让装配失败。
- **无 Config schema** — 本 bundle 未声明 Config schema，行 `config` 原样透传；拼写错误的键只表现为摘要字段缺失。
- **每个配置档一段** — patch 只插入一条 `dsh-progressive-injection` 行；重复组合本 bundle 会插入重复 id，对账步骤拒绝该 patch。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>
