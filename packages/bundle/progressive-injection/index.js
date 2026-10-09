/**
 * Progressive injection enabler for the DeepSeek Harness.
 *
 * Registers one `defer: true` prompt section — a live `git status` digest —
 * whose provider runs only after the agent loop has already admitted the
 * skeleton system prompt (see `SystemPrompt.assembleProgressive`). The slow
 * I/O therefore never delays time-to-first-token; it is folded into the
 * completed assembly the loop caches for the turn's later steps.
 *
 * Requires the progressive-assembly core change (feat/progressive-injection):
 * `PromptSection.defer`, `SystemPrompt.assembleProgressive`, and the agent
 * loop's skeleton-then-full admission.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const name = '@deepseek-ai/dsh-progressive-injection-bundle'

/** One git invocation, bounded and cancellable through the assembly signal. */
async function runGit(cwd, args, signal) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    signal,
    timeout: 5000,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  return stdout
}

async function renderGitStatus(config, signal) {
  const cwd = (config && config.cwd) || process.cwd()
  const includeStatus = !config || config.includeStatus !== false
  const includeLastCommit = !config || config.includeLastCommit !== false
  try {
    const parts = ['## Git status (progressive)']
    const branch = await runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'], signal)
    parts.push(`Branch: ${branch.trim()}`)

    if (includeStatus) {
      const status = await runGit(cwd, ['status', '--porcelain=v1'], signal)
      const lines = status.split('\n').map(line => line.trimEnd()).filter(Boolean)
      parts.push(lines.length === 0
        ? 'Working tree clean'
        : `Changed: ${lines.length} file(s)\n${lines.slice(0, 60).join('\n')}`)
    }

    if (includeLastCommit) {
      const log = await runGit(cwd, ['log', '-1', '--format=%h %s'], signal)
      parts.push(`Last commit: ${log.trim()}`)
    }
    return parts.join('\n')
  } catch {
    // Not a git repository, git unavailable, aborted, or timed out: the
    // deferred section folds to empty text instead of failing the assembly.
    return ''
  }
}

export function apply(ctx, config = {}) {
  ctx.inject(['systemPrompt'], (promptCtx) => {
    promptCtx.systemPrompt.section({
      name: 'progressive-injection:git-status',
      order: promptCtx.systemPrompt.getSectionOrder('HARNESS_SOURCE'),
      interpolate: false,
      defer: true,
      text: ({ agent, signal }) => renderGitStatus(config, signal),
    })
  })
}
