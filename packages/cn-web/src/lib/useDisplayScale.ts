import { useEffect, useState } from 'react'

const GUIDELINE_WIDTH = 390
const SCALE_MIN = 0.92
const SCALE_MAX = 1.2

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value))
const computeScale = (width: number) => clamp(width / GUIDELINE_WIDTH, SCALE_MIN, SCALE_MAX)

/**
 * Display-relative bounded scale factor (ADR 0022, web): tracks the viewport width against a ~390px
 * guideline, clamped 0.92–1.2. Mirrors the native `useDisplayScale`. Returns the live scale; use it
 * for raw inline sizes (icon px, media dimensions). Pair with {@link useApplyDisplayScale} to drive
 * the token `--ui-scale` so the calc()-based spacing/type ramp scale with the viewport (breakpoints
 * stay the primary web lever; this is the bounded secondary fit).
 */
export function useDisplayScale(): number {
  const [scale, setScale] = useState(() =>
    typeof window === 'undefined' ? 1 : computeScale(window.innerWidth),
  )
  useEffect(() => {
    const onResize = () => setScale(computeScale(window.innerWidth))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

/**
 * Drives the token `--ui-scale` CSS var on the document root from the viewport (ADR 0022 web display
 * scaling), so the `calc(* var(--ui-scale))` spacing + type ramp scale responsively. Call once near
 * the app root. No-op during SSR; removes the var on unmount.
 *
 * Unlike native (where NativeWind inlines dimension utilities at build time, so this has no runtime
 * effect), the browser resolves the calc live, so this is the working web scaling axis.
 */
export function useApplyDisplayScale(): void {
  const scale = useDisplayScale()
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--ui-scale', String(scale))
    return () => {
      root.style.removeProperty('--ui-scale')
    }
  }, [scale])
}
