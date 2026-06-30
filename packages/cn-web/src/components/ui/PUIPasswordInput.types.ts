/**
 * Shared prop surface for PUIPasswordInput's show/hide toggle, identical on web and native.
 * Labels are the accessibility name for the toggle button (the visible affordance is a Lucide
 * eye icon on both platforms), so they must be plain strings.
 */
export interface PUIPasswordToggleProps {
  showLabel?: string
  hideLabel?: string
}
