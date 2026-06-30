import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUIErrorState } from './PUIErrorState'

const meta = {
  title: 'PUI/States/ErrorState',
  component: PUIErrorState,
  tags: ['autodocs'],
  args: { title: 'Something went wrong' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIErrorState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PUIErrorState
      action={<PUIButton variant="default">Try again</PUIButton>}
      description="We could not load your data. Please try again."
      icon={<span className="text-3xl">⚠️</span>}
      title="Something went wrong"
    />
  ),
}
