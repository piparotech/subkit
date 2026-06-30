import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUISpinner } from './PUISpinner'

const meta = {
  title: 'PUI/Feedback/Spinner',
  component: PUISpinner,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUISpinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <PUISpinner /> }

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <PUISpinner size="sm" />
      <PUISpinner size="md" />
      <PUISpinner size="lg" />
    </div>
  ),
}

export const Tones: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <PUISpinner tone="default" />
      <PUISpinner tone="muted" />
      <PUISpinner tone="brand" />
    </div>
  ),
}

export const WithLabel: Story = { render: () => <PUISpinner label="Loading" /> }
