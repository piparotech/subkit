import { cn } from '../../lib/utils'
import { type PUISliderOwnProps } from './PUISlider.types'

export { type PUISliderOwnProps } from './PUISlider.types'

export type PUISliderProps = PUISliderOwnProps

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Token-styled range input. Controlled via value/onValueChange; the filled track follows the value. */
export function PUISlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step,
  disabled = false,
  className,
}: PUISliderProps) {
  const range = max - min || 1
  const pct = clamp((value - min) / range, 0, 1) * 100

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step ?? 'any'}
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      className={cn(
        'bg-muted h-2 w-full cursor-pointer appearance-none rounded-full outline-none',
        'focus-visible:ring-ring focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none',
        '[&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2',
        '[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2',
        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--color-action-primary-background) ${pct}%, var(--color-background-muted) ${pct}%)`,
      }}
    />
  )
}
