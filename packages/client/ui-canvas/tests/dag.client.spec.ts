import { describe, expect, it } from 'vitest'
import { computeDAGLayout, mergeStyle } from '../src/index.ts'

describe('mergeStyle', () => {
  it('merges base and override', () => {
    expect(mergeStyle({ color: 'red' }, { color: 'blue', gap: 4 })).toEqual({ color: 'blue', gap: 4 })
  })

  it('returns base when override is absent', () => {
    expect(mergeStyle({ color: 'red' })).toEqual({ color: 'red' })
  })
})

describe('computeDAGLayout', () => {
  it('ranks a linear chain from source to sink', () => {
    const { nodes, edges, ranks } = computeDAGLayout({
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
    })
    const byId = new Map(nodes.map(n => [n.id, n]))
    expect(byId.get('a')!.rank).toBe(0)
    expect(byId.get('b')!.rank).toBe(1)
    expect(byId.get('c')!.rank).toBe(2)
    expect(edges.every(e => !e.isBackEdge)).toBe(true)
    expect(ranks).toHaveLength(3)
  })

  it('flags back-edges in a cycle without crashing', () => {
    const { edges, nodes } = computeDAGLayout({
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
      ],
    })
    expect(nodes).toHaveLength(3)
    expect(edges.some(e => e.isBackEdge)).toBe(true)
  })

  it('lays out horizontal direction with swapped axes', () => {
    const vert = computeDAGLayout({
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ from: 'a', to: 'b' }],
      direction: 'vertical',
    })
    const horiz = computeDAGLayout({
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ from: 'a', to: 'b' }],
      direction: 'horizontal',
    })
    const va = vert.nodes.find(n => n.id === 'a')!
    const ha = horiz.nodes.find(n => n.id === 'a')!
    // In vertical mode the first rank sits at padding (x=24); in horizontal
    // mode that offset lands on y instead.
    expect(va.x).toBe(24)
    expect(va.y).toBe(24)
    expect(ha.y).toBe(24)
    expect(ha.x).toBe(24)
    expect(horiz.direction).toBe('horizontal')
  })

  it('ignores edges referencing unknown nodes', () => {
    const { edges } = computeDAGLayout({
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'ghost' },
      ],
    })
    expect(edges).toHaveLength(1)
  })
})
