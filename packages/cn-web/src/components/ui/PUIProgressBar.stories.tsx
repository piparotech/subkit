import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIProgressBar } from './PUIProgressBar'

const meta = {
  title: 'PUI/Feedback/ProgressBar',
  component: PUIProgressBar,
  tags: ['autodocs'],
  args: { value: 60 },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIProgressBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <PUIProgressBar value={60} /> }

export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <PUIProgressBar tone="brand" value={60} />
      <PUIProgressBar tone="success" value={60} />
      <PUIProgressBar tone="danger" value={60} />
      <PUIProgressBar tone="warning" value={60} />
    </div>
  ),
}

export const Indeterminate: Story = { render: () => <PUIProgressBar indeterminate value={60} /> }

export const WithLabel: Story = {
  render: () => <PUIProgressBar label="Uploading…" value={60} />,
}
