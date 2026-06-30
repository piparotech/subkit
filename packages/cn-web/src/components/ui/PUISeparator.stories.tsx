import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUISeparator } from './PUISeparator'

const meta = {
  title: 'PUI/Layout/Separator',
  component: PUISeparator,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUISeparator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = { render: () => <PUISeparator /> }

export const InContext: Story = {
  render: () => (
    <div className="flex flex-col gap-3 text-sm text-foreground">
      <span>Above</span>
      <PUISeparator />
      <span>Below</span>
    </div>
  ),
}

export const Inset: Story = {
  render: () => (
    <div className="flex flex-col gap-3 text-sm text-foreground">
      <span>Above</span>
      <PUISeparator inset />
      <span>Below</span>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="flex h-6 items-center gap-3 text-sm text-foreground">
      <span>Left</span>
      <PUISeparator orientation="vertical" />
      <span>Right</span>
    </div>
  ),
}
