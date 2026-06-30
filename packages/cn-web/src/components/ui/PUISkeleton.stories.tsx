import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUISkeleton } from './PUISkeleton'

const meta = {
  title: 'PUI/Feedback/Skeleton',
  component: PUISkeleton,
  tags: ['autodocs'],
  args: { className: 'h-4 w-32' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUISkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Shapes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <PUISkeleton className="h-12 w-12 rounded-full" />
      <PUISkeleton className="h-4 w-48" />
      <PUISkeleton className="h-4 w-32" />
    </div>
  ),
}

export const CardPlaceholder: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <PUISkeleton className="h-12 w-12 rounded-full" />
      <div className="flex flex-col gap-2">
        <PUISkeleton className="h-4 w-40" />
        <PUISkeleton className="h-3 w-24" />
      </div>
    </div>
  ),
}
