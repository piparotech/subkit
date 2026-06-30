import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUIEmptyState } from './PUIEmptyState'

const meta = {
  title: 'PUI/States/EmptyState',
  component: PUIEmptyState,
  tags: ['autodocs'],
  args: { title: 'No items yet' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIEmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PUIEmptyState
      action={<PUIButton variant="default">Create item</PUIButton>}
      description="Get started by creating your first item."
      icon={<span className="text-3xl">📭</span>}
      title="No items yet"
    />
  ),
}
