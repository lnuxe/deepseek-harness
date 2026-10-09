import { createUserMessage, type GenerateOptions } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { MockAdapter, textResponse, toolCallResponse } from './mock-adapter.ts'

async function harness(adapter: MockAdapter): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SystemPrompt, { includeHarnessIdentity: false, personaPrefix: '', personaSuffix: '' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  ctx.llm.registerAdapter(['mock'], adapter)
  return ctx
}

function systemTexts(request: GenerateOptions): string[] {
  return request.messages
    .filter(message => message.role === 'system')
    .map(message => message.content.filter(block => block.type === 'text').map(block => block.text).join(''))
}

describe('progressive injection', () => {
  it('sends the skeleton first and the full prompt on the following step', async () => {
    let resolveSlow!: (value: string) => void
    const slow = new Promise<string>((resolve) => { resolveSlow = resolve })
    // The first model call resolves the slow section as its stream starts, so
    // the skeleton request is already recorded before completion can land.
    const adapter = new MockAdapter([
      () => {
        resolveSlow('slow section')
        return toolCallResponse('c1', 'search', {})
      },
      textResponse('done'),
    ])
    const ctx = await harness(adapter)
    ctx.tools.register(defineContentToolFixture({
      name: 'search', description: 'search tool', parameters: {}, execute: async () => [{ type: 'text', text: 'done' }],
    }))
    ctx.systemPrompt.section({ name: 'fast', order: 10, text: 'fast section' })
    ctx.systemPrompt.section({ name: 'slow', order: 20, defer: true, text: async () => await slow })

    const agent = await ctx.agentLoop.create(SessionId('prog'), { provider: 'mock', model: 'mock' })
    agent.followup(createUserMessage({ content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
    await agent.whenIdle()

    expect(adapter.requests).toHaveLength(2)
    // First step reads the skeleton: the deferred section is still empty.
    expect(systemTexts(adapter.requests[0]!)).toEqual(['fast section'])
    // Second step reads the full prompt, deferred section completed.
    expect(systemTexts(adapter.requests[1]!)).toEqual(['fast section\n\nslow section'])
    await ctx.fiber.dispose()
  })

  it('does not stack a duplicate system node on an in-history route', async () => {
    let resolveSlow!: (value: string) => void
    const slow = new Promise<string>((resolve) => { resolveSlow = resolve })
    const adapter = new MockAdapter([
      () => {
        resolveSlow('slow section')
        return toolCallResponse('c1', 'search', {})
      },
      textResponse('done'),
      textResponse('done'),
    ])
    adapter.systemPromptUpdate = 'in-history'
    const ctx = await harness(adapter)
    ctx.tools.register(defineContentToolFixture({
      name: 'search', description: 'search tool', parameters: {}, execute: async () => [{ type: 'text', text: 'done' }],
    }))
    ctx.systemPrompt.section({ name: 'fast', order: 10, text: 'fast section' })
    ctx.systemPrompt.section({ name: 'slow', order: 20, defer: true, text: async () => await slow })

    const agent = await ctx.agentLoop.create(SessionId('prog-history'), { provider: 'mock', model: 'mock' })
    agent.followup(createUserMessage({ content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
    await agent.whenIdle()

    // The second step projects the completed prompt once; the skeleton and the
    // completion never both land in the same request more than they should.
    expect(systemTexts(adapter.requests[1]!)).toContain('fast section\n\nslow section')
    await ctx.fiber.dispose()
  })
})
