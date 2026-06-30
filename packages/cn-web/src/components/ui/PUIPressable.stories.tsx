import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIPressable } from './PUIPressable'

const meta = {
  title: 'PUI/Pressable',
  component: PUIPressable,
  tags: ['autodocs'],
  args: { scaleOnPress: true, disabled: false },
  argTypes: {
    scaleOnPress: { control: 'boolean' },
    disabled: { control: 'boolean' },
    haptic: {
      control: 'select',
      options: [false, 'light', 'medium', 'heavy', 'success', 'warning', 'error', 'selection'],
    },
  },
} satisfies Meta<typeof PUIPressable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <PUIPressable {...args} className="rounded-lg bg-primary px-4 py-2.5">
      <span className="text-sm font-semibold text-primary-foreground">Press me</span>
    </PUIPressable>
  ),
}

export const Card: Story = {
  render: (args) => (
    <PUIPressable
      {...args}
      className="flex-col items-start rounded-xl border border-border bg-card p-5 text-left"
    >
      <span className="text-base font-semibold text-foreground">Tappable card</span>
      <span className="text-sm text-muted-foreground">Whole surface presses with a scale</span>
    </PUIPressable>
  ),
}

export const NoScale: Story = {
  args: { scaleOnPress: false },
  render: (args) => (
    <PUIPressable {...args} className="rounded-lg bg-muted px-4 py-2.5">
      <span className="text-sm font-semibold text-foreground">No scale</span>
    </PUIPressable>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <PUIPressable {...args} className="rounded-lg bg-primary px-4 py-2.5">
      <span className="text-sm font-semibold text-primary-foreground">Disabled</span>
    </PUIPressable>
  ),
}
