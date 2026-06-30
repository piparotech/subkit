import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

import { PUIButton } from './PUIButton'

const meta = {
  title: 'PUI/Button',
  component: PUIButton,
  tags: ['autodocs'],
  args: { children: 'Button' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'onBrand'],
    },
    size: { control: 'select', options: ['xs', 'sm', 'default', 'lg', 'icon'] },
    shape: { control: 'select', options: ['default', 'pill', 'square'] },
    danger: { control: 'boolean' },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
} satisfies Meta<typeof PUIButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { children: 'Primary' } }
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } }
export const Destructive: Story = { args: { children: 'Destructive', variant: 'destructive' } }
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } }
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } }
export const Large: Story = { args: { children: 'Large', size: 'lg' } }
/**
 * Loading state: a spinner replaces `addonStart`, the trailing `addonEnd` is dropped, and the
 * button is non-interactive (`disabled`). For parity with the native twin's
 * `accessibilityState={{ busy: loading }}`, the loading button is announced as busy via `aria-busy`,
 * so assistive tech reports the in-progress action rather than only its disabled state.
 */
export const Loading: Story = { args: { children: 'Saving', loading: true } }
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } }

/** Uber xSmall — an inline/supporting action. The 36pt box keeps a 44px hit target via min height. */
export const ExtraSmall: Story = { args: { children: 'Extra small', size: 'xs' } }

/** Branded fill for use on a brand-colored surface — rendered here on a `bg-brand` panel. */
export const OnBrand: Story = {
  args: { children: 'Join membership', variant: 'onBrand' },
  decorators: [
    (Story) => (
      <div className="bg-brand rounded-xl p-6">
        <Story />
      </div>
    ),
  ],
}

/** Fully rounded pill shape. */
export const Pill: Story = {
  args: {
    children: 'Add to cart',
    shape: 'pill',
    addonStart: <Plus aria-hidden className="size-4" />,
  },
}

/** Square icon-style box — pass `aria-label` for an accessible name. */
export const Square: Story = {
  args: {
    children: <Plus aria-hidden className="size-5" />,
    shape: 'square',
    'aria-label': 'Add item',
  },
}

/** Orthogonal danger modifier on a filled primary — swaps the surface to the danger surface. */
export const DangerPrimary: Story = {
  args: {
    children: 'Delete account',
    danger: true,
    addonStart: <Trash2 aria-hidden className="size-4" />,
  },
}

/** Orthogonal danger modifier on the quieter outline — recolors label + border to destructive. */
export const DangerOutline: Story = {
  args: { children: 'Remove', variant: 'outline', danger: true },
}

/** Orthogonal danger modifier on ghost — recolors only the label to destructive. */
export const DangerGhost: Story = {
  args: { children: 'Discard', variant: 'ghost', danger: true },
}

/** Trailing affordance signalling more options follow. */
export const WithTrailingIcon: Story = {
  args: {
    children: 'Sort by',
    variant: 'outline',
    addonEnd: <ChevronDown aria-hidden className="size-4" />,
  },
}

/** Uber Fill width — stretches to its container. */
export const FullWidth: Story = {
  args: { children: 'Continue', fullWidth: true },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
}

/**
 * `fullWidth` paired with a trailing `addonEnd`. Cross-platform behavioral difference worth
 * documenting: the native twin lifts the trailing artwork out of the flex flow and pins it to the
 * trailing edge (absolute) so the label stays centered in the stretched row. The web twin does
 * **not** edge-pin — `addonEnd` stays inline inside the centered flex row, so the label sits just
 * left of the icon rather than centered across the full width.
 */
export const FullWidthWithTrailingIcon: Story = {
  args: {
    children: 'Continue',
    fullWidth: true,
    addonEnd: <ChevronDown aria-hidden className="size-4" />,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
}
