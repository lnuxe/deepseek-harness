/**
 * Form primitives — themed, controlled controls. Every `onChange` receives the
 * value directly (not a DOM event), so they pair naturally with `useCanvasState`.
 */
import type { CSSProperties, ReactNode, JSX } from 'react'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { useHostTheme } from './hooks.js'
import { canvasRadius, canvasTypography } from './theme.js'
import { mergeStyle } from './primitives.js'

const controlBase = (theme: ReturnType<typeof useHostTheme>): CSSProperties => ({
  background: theme.fill.secondary,
  border: `1px solid ${theme.stroke.secondary}`,
  borderRadius: canvasRadius.sm,
  color: theme.text.primary,
  fontSize: 13,
  padding: '4px 8px',
  outline: 'none',
})

export type TextInputProps = {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'search'
  style?: CSSProperties
}
export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = 'text',
  style,
}: TextInputProps): JSX.Element {
  const theme = useHostTheme()
  return (
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      style={mergeStyle({ ...controlBase(theme), height: 28, width: '100%' }, style)}
    />
  )
}

export type TextAreaProps = {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  style?: CSSProperties
}
export function TextArea({
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 3,
  style,
}: TextAreaProps): JSX.Element {
  const theme = useHostTheme()
  const ref = useRef<HTMLTextAreaElement>(null)
  const resize = useCallback(() => {
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [])
  useLayoutEffect(() => {
    resize()
  }, [resize])
  const base: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: '28px',
    padding: '4px 8px',
    border: `1px solid ${theme.stroke.secondary}`,
    borderRadius: canvasRadius.md,
    background: theme.fill.tertiary,
    color: theme.text.primary,
    fontSize: '13px',
    lineHeight: '18px',
    letterSpacing: '0.13px',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
  }
  return (
    <textarea
      ref={ref}
      value={value ?? ''}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      onInput={resize}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={mergeStyle(base, style)}
    />
  )
}

export type CheckboxProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: ReactNode
  style?: CSSProperties
}
export function Checkbox({ checked, onChange, disabled, label, style }: CheckboxProps): JSX.Element {
  const theme = useHostTheme()
  const box = (
    <input
      type="checkbox"
      checked={checked ?? false}
      disabled={disabled}
      onChange={e => onChange?.(e.target.checked)}
      style={{ accentColor: theme.accent.primary, cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
  )
  return label ? (
    <label
      style={mergeStyle(
        { display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer' },
        style,
      )}
    >
      {box}
      <span style={{ ...canvasTypography.body, color: theme.text.primary }}>{label}</span>
    </label>
  ) : (
    <span style={style}>{box}</span>
  )
}

export type ToggleProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  style?: CSSProperties
}
export function Toggle({ checked, onChange, disabled, size = 'sm', style }: ToggleProps): JSX.Element {
  const theme = useHostTheme()
  const w = size === 'md' ? 36 : 28
  const h = size === 'md' ? 20 : 16
  const on = checked ?? false
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      style={mergeStyle(
        {
          width: w,
          height: h,
          borderRadius: canvasRadius.full,
          border: 'none',
          background: on ? theme.accent.primary : theme.fill.tertiary,
          position: 'relative',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : undefined,
          padding: 0,
          flexShrink: 0,
        },
        style,
      )}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? w - h + 2 : 2,
          width: h - 4,
          height: h - 4,
          borderRadius: canvasRadius.full,
          background: '#ffffff',
          transition: 'left 120ms ease',
        }}
      />
    </button>
  )
}

export type SelectOption = { value: string; label: string; disabled?: boolean }
export type SelectProps = {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  style?: CSSProperties
}
export function Select({ value, onChange, options, placeholder, disabled, style }: SelectProps): JSX.Element {
  const theme = useHostTheme()
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      style={mergeStyle({ ...controlBase(theme), height: 28, width: '100%', colorScheme: theme.kind === 'light' ? 'light' : 'dark' }, style)}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map(o => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export type IconButtonProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  variant?: 'default' | 'circle'
  size?: 'sm' | 'md'
  style?: CSSProperties
}
export function IconButton({
  children,
  onClick,
  disabled,
  title,
  variant = 'default',
  size = 'md',
  style,
}: IconButtonProps): JSX.Element {
  const theme = useHostTheme()
  const dim = size === 'sm' ? 16 : 20
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={mergeStyle(
        {
          width: dim,
          height: dim,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: variant === 'circle' ? canvasRadius.full : canvasRadius.sm,
          background: variant === 'circle' ? theme.fill.secondary : 'transparent',
          color: theme.text.secondary,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : undefined,
          padding: 0,
          flexShrink: 0,
        },
        style,
      )}
    >
      {children}
    </button>
  )
}
