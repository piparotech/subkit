import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIText } from './PUIText'
import { PUIView } from './PUIView'

const meta = {
  title: 'PUI/View',
  component: PUIView,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'subtle', 'muted', 'card'] },
  },
} satisfies Meta<typeof PUIView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PUIView className="rounded-lg p-4">
      <PUIText>Default surface (background)</PUIText>
    </PUIView>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <PUIView className="rounded-lg p-4" variant="default">
        <PUIText>default</PUIText>
      </PUIView>
      <PUIView className="rounded-lg p-4" variant="subtle">
        <PUIText>subtle</PUIText>
      </PUIView>
      <PUIView className="rounded-lg p-4" variant="muted">
        <PUIText>muted</PUIText>
      </PUIView>
      <PUIView className="rounded-lg border border-border p-4" variant="card">
        <PUIText>card</PUIText>
      </PUIView>
    </div>
  ),
}
