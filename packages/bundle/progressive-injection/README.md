---
description: "Deferred git-status prompt section for dsh profiles: the skeleton prompt answers immediately and the git digest folds in once it resolves, for users running slow-repository sessions."
kind: "package-bundle"
---

# @deepseek-ai/dsh-progressive-injection-bundle

English | [中文](README.zh.md)

## Summary

Adds a deferred `git-status` prompt section to a dsh profile: the agent loop emits the skeleton system prompt immediately and folds the git digest into the completed assembly once the provider resolves, so slow repositories never delay time-to-first-token. The bundle registers one prompt section (`progressive-injection:git-status`) with `defer: true` and an async provider that runs `git rev-parse`, `git status`, and `git log`. No in-box profile includes it; add or remove it with `dsh plugin`. Failure of the underlying git commands renders the section empty instead of failing the assembly.

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

### Install into a profile

```text
dsh plugin --profile <name> add @deepseek-ai/dsh-progressive-injection-bundle
dsh plugin --profile <name> remove @deepseek-ai/dsh-progressive-injection-bundle
```

The bundle resolves from the current checkout's `packages/bundle/progressive-injection`; the plugin reconcile step activates the layer by applying `cordis.patch.yml` to the composed profile. Without the patch declaration the install is refused.

### What you get

One prompt section named `progressive-injection:git-status`, deferred so slow git I/O never blocks the first token:

| key | type | default | meaning |
| --- | --- | --- | --- |
| `cwd` | `string \| null` | `null` | Directory for `git`; `null` falls back to the dsh process cwd. |
| `includeStatus` | `boolean` | `true` | Include the `git status --porcelain` changed-file list. |
| `includeLastCommit` | `boolean` | `true` | Include the most recent commit hash and subject. |

Edit the row's `config` in `cordis.patch.yml` (the bundle declares no Config schema, so the row `config` is passed through verbatim):

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
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The patch document is a single `insert` row: `id: dsh-progressive-injection`, the prompt section with `defer: true`, and its async provider. The provider runs `git rev-parse`, `git status --porcelain`, and `git log -1` through the Host process, and the agent loop's progressive assembly (skeleton-then-full admission with a per-turn cache) folds the digest into the completed system prompt. Source map:

| Source | Role |
| --- | --- |
| [`cordis.patch.yml`](cordis.patch.yml) | The inserted prompt-section row and default config |
| [`src/index.ts`](src/index.ts) | The deferred section provider and git runners |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Bundle package map](../README.md) — the surfaces built on the same core.
- [dsh-base](../base/README.md) — the shared core this bundle layers onto.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the inserted deferred prompt section, whose git digest enters the assembled system prompt while the composed profile and agent loop own the assembly.

#### KV Cache effect

The section participates in the per-turn progressive assembly cache: the skeleton prompt is emitted without it and the digest enters the completed assembly once resolved, so a turn that waits for git sees the section text in the cached prefix only after it resolves.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Git-only source** — the section reads repository state through `git`; a non-git directory, missing `git`, cancellation, or a timeout renders the section empty rather than failing the assembly.
- **No Config schema** — the bundle declares no Config schema, so the row `config` is passed through verbatim; typo keys surface only as missing digest fields.
- **One section per profile** — the patch inserts exactly one `dsh-progressive-injection` row; composing the bundle twice inserts a duplicate id and the reconcile step refuses the patch.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
