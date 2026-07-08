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
    <PUIPressable {...args} className="bg-primary rounded-lg px-4 py-2.5">
      <span className="text-primary-foreground text-sm font-semibold">Press me</span>
    </PUIPressable>
  ),
}

export const Card: Story = {
  render: (args) => (
    <PUIPressable
      {...args}
      className="border-border bg-card flex-col items-start rounded-xl border p-5 text-left"
    >
      <span className="text-foreground text-base font-semibold">Tappable card</span>
      <span className="text-muted-foreground text-sm">Whole surface presses with a scale</span>
    </PUIPressable>
  ),
}

export const NoScale: Story = {
  args: { scaleOnPress: false },
  render: (args) => (
    <PUIPressable {...args} className="bg-muted rounded-lg px-4 py-2.5">
      <span className="text-foreground text-sm font-semibold">No scale</span>
    </PUIPressable>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <PUIPressable {...args} className="bg-primary rounded-lg px-4 py-2.5">
      <span className="text-primary-foreground text-sm font-semibold">Disabled</span>
    </PUIPressable>
  ),
}
