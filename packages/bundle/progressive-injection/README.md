# Progressive Injection

Deploys the progressive prompt-assembly capability (Cursor's `info_complete`
analogue) as an installable Host bundle for the DeepSeek Harness.

## What it does

The bundle registers one prompt section named
`progressive-injection:git-status` with `defer: true` and an async provider
that runs `git rev-parse` / `git status` / `git log`. Because the section is
deferred, the agent loop emits the **skeleton** system prompt immediately
(without awaiting `git`) and folds the digest into the **completed** assembly
once the provider resolves — so slow I/O never delays time-to-first-token.

## Relationship to the core change

The mechanism this bundle exercises is a core extension:

- `PromptSection.defer` marker and async `text` providers;
- `SystemPrompt.assembleProgressive(context)` returning `{ prompt, pending }`;
- the agent loop's skeleton-then-full admission and per-turn cache.

That change (`feat/progressive-injection`, `packages/core/system-prompt` +
`packages/core/agent-loop`) cannot be expressed purely as a bundle because the
agent loop's assembly call site and the `assembleProgressive` service method
are not pluggable from the existing extension surface. This bundle is the
**consumer** of that mechanism: it applies the capability to a real slow
section and makes it configurable per profile.

## Configuration

| key | type | default | meaning |
| --- | --- | --- | --- |
| `cwd` | `string \| null` | `null` | Directory for `git`; `null` falls back to the dsh process cwd. |
| `includeStatus` | `boolean` | `true` | Include the `git status --porcelain` changed-file list. |
| `includeLastCommit` | `boolean` | `true` | Include the most recent commit hash and subject. |

Edit the row's `config` in `cordis.patch.yml` (the bundle declares no Config
schema, so the row `config` is passed through verbatim):

```yaml
- insert:
    - id: dsh-progressive-injection
      name: '@deepseek-ai/dsh-progressive-injection-bundle'
      config:
        cwd: /path/to/repo
        includeStatus: true
        includeLastCommit: true
```

## Failure behaviour

A non-git directory, missing `git`, cancellation, or a timeout makes the
section render empty text — the assembly never fails because of it.
