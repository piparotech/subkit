import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUIStateBlock } from './PUIStateBlock'

const meta = {
  title: 'PUI/States/StateBlock',
  component: PUIStateBlock,
  tags: ['autodocs'],
  args: { title: 'State title' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIStateBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Status: Story = {
  render: () => (
    <PUIStateBlock
      action={<PUIButton variant="default">Primary action</PUIButton>}
      description="Centered column shared by EmptyState and ErrorState."
      icon={<span className="text-3xl">📦</span>}
      role="status"
      title="State title"
    />
  ),
}

export const Alert: Story = {
  render: () => (
    <PUIStateBlock
      description="Renders with assertive live-region semantics."
      icon={<span className="text-3xl">⚠️</span>}
      role="alert"
      title="Alert title"
    />
  ),
}
