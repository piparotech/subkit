import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIErrorBoundary } from './PUIErrorBoundary'
import { PUIText } from './PUIText'

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
        <div className="min-h-skeleton-xl bg-background p-xl flex flex-col items-center justify-center text-center">
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
