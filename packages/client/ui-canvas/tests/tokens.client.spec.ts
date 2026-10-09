import { describe, expect, it } from 'vitest'
import {
  applyPrimaryColor,
  applyWorkbenchSurfaces,
  buildHostTokens,
  canvasPaletteDark,
  canvasPaletteLight,
  canvasTokens,
  canvasTokensLight,
  categoryPaletteDark,
  categoryPaletteLight,
  mixTransparent,
  mixTwo,
  relativeLuminance,
} from '../src/tokens.ts'

describe('mixTransparent', () => {
  it('appends a rounded alpha byte', () => {
    expect(mixTransparent('#F0F0F0', 74)).toBe('#F0F0F0BD')
    expect(mixTransparent('#000000', 0)).toBe('#00000000')
    expect(mixTransparent('#000000', 100)).toBe('#000000FF')
  })

  it('clamps percent to 0-100', () => {
    expect(mixTransparent('#FFFFFF', -10)).toBe('#FFFFFF00')
    expect(mixTransparent('#FFFFFF', 200)).toBe('#FFFFFFFF')
  })
})

describe('mixTwo', () => {
  it('mixes two hex colors by percent', () => {
    expect(mixTwo('#000000', '#FFFFFF', 50)).toBe('#808080')
    expect(mixTwo('#000000', '#000000', 42)).toBe('#000000')
  })
})

describe('relativeLuminance', () => {
  it('returns 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
  })
})

describe('category palettes', () => {
  it('expose the nine shared category hues', () => {
    const hues = ['blue', 'purple', 'green', 'yellow', 'cyan', 'pink', 'orange', 'red', 'gray'] as const
    for (const hue of hues) {
      expect(categoryPaletteDark[hue]).toMatch(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)
      expect(categoryPaletteLight[hue]).toMatch(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)
    }
  })
})

describe('canvasTokens', () => {
  it('derives foreground from the dark base without alpha', () => {
    expect(canvasTokens.text.primary).toBe('#F0F0F0')
    expect(canvasTokens.text.secondary).toBe('#F0F0F0BD')
  })

  it('derives the light set from the light base', () => {
    expect(canvasTokensLight.text.primary).toBe('#141414')
    expect(canvasTokensLight.text.primary).not.toBe(canvasTokens.text.primary)
  })

  it('keeps category tokens attached', () => {
    expect(canvasTokens.category.blue).toBe(categoryPaletteDark.blue)
  })
})

describe('applyPrimaryColor', () => {
  it('overlays accent-adjacent entries only', () => {
    const out = applyPrimaryColor(canvasPaletteDark, '#FF0000')
    expect(out.accent).toBe('#FF0000')
    expect(out.buttonBackground).toBe('#FF0000')
    expect(out.strokeFocused).toBe('#FF0000')
    expect(out.link).toBe('#FF0000')
    // Non-accent entries stay untouched.
    expect(out.foreground).toBe(canvasPaletteDark.foreground)
    expect(out.fillPrimary).toBe(canvasPaletteDark.fillPrimary)
  })

  it('ignores non-hex inputs', () => {
    expect(applyPrimaryColor(canvasPaletteDark, 'not-a-color')).toBe(canvasPaletteDark)
  })
})

describe('applyWorkbenchSurfaces', () => {
  it('overlays the editor surface family (sidebar untouched, per Cursor)', () => {
    const out = applyWorkbenchSurfaces(canvasPaletteDark, { editorBackground: '#123456' })
    expect(out.editor).toBe('#123456')
    expect(out.chrome).toBe('#123456')
    expect(out.elevated).toBe('#123456')
    expect(out.sidebar).toBe(canvasPaletteDark.sidebar)
  })

  it('overlays the foreground when editorForeground is valid', () => {
    const out = applyWorkbenchSurfaces(canvasPaletteDark, { editorForeground: '#ABCDEF' })
    expect(out.foreground).toBe('#ABCDEF')
  })

  it('ignores invalid or missing surfaces', () => {
    expect(applyWorkbenchSurfaces(canvasPaletteDark, {})).toBe(canvasPaletteDark)
  })
})

describe('buildHostTokens', () => {
  it('picks light palette for light kinds', () => {
    const { tokens, palette } = buildHostTokens('light')
    expect(tokens.text.primary).toBe(canvasTokensLight.text.primary)
    expect(palette.foreground).toBe(canvasPaletteLight.foreground)
  })

  it('picks dark palette for other kinds', () => {
    expect(buildHostTokens('dark').tokens.text.primary).toBe(canvasTokens.text.primary)
    expect(buildHostTokens('hc-dark').tokens.text.primary).toBe(canvasTokens.text.primary)
  })

  it('overlays a host primary color', () => {
    const { tokens } = buildHostTokens('dark', { primary: '#FF0000' })
    expect(tokens.accent.primary).toBe('#FF0000')
    expect(tokens.accent.control).toBe('#FF0000')
  })
})
