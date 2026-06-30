import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIText } from './PUIText'
import { PUIErrorBoundary } from './PUIErrorBoundary'

function Boom(): React.ReactElement {
  throw new Error('Demo failure from a child component')
}

const meta = {
  title: 'PUI/Feedback/ErrorBoundary',
  component: PUIErrorBoundary,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-popover-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIErrorBoundary>

export default meta
type Story = StoryObj<typeof meta>

export const DefaultFallback: Story = {
  render: () => (
    <PUIErrorBoundary>
      <Boom />
    </PUIErrorBoundary>
  ),
}

export const CustomFallback: Story = {
  render: () => (
    <PUIErrorBoundary
      fallback={(error) => (
        <div className="flex min-h-skeleton-xl flex-col items-center justify-center bg-background p-xl text-center">
          <PUIText tone="muted" variant="callout">
            Custom: {error.message}
          </PUIText>
        </div>
      )}
    >
      <Boom />
    </PUIErrorBoundary>
  ),
}

export const HealthyChild: Story = {
  render: () => (
    <PUIErrorBoundary>
      <PUIText variant="body">Child rendered without errors.</PUIText>
    </PUIErrorBoundary>
  ),
}
