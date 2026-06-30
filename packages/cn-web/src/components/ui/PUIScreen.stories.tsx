import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUICard,
  PUICardContent,
  PUICardDescription,
  PUICardHeader,
  PUICardTitle,
} from './PUICard'
import { PUIScreen } from './PUIScreen'
import { PUIText } from './PUIText'

const meta = {
  title: 'PUI/Layout/Screen',
  component: PUIScreen,
  tags: ['autodocs'],
} satisfies Meta<typeof PUIScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PUIScreen>
      <PUIText className="block" variant="title2">
        Screen
      </PUIText>
      <PUIText className="block" tone="muted" variant="callout">
        Centered page container, max-w-2xl with padding (default).
      </PUIText>
    </PUIScreen>
  ),
}

export const Unpadded: Story = {
  render: () => (
    <PUIScreen padded={false}>
      <PUICard>
        <PUICardHeader>
          <PUICardTitle>Edge to edge</PUICardTitle>
          <PUICardDescription>padded=false removes content padding.</PUICardDescription>
        </PUICardHeader>
        <PUICardContent>Useful for full-bleed headers and lists.</PUICardContent>
      </PUICard>
    </PUIScreen>
  ),
}

export const Scroll: Story = {
  render: () => (
    <PUIScreen scroll className="h-80">
      {Array.from({ length: 12 }).map((_, i) => (
        <PUIText key={i} className="block py-2">
          Scrollable row {i + 1}
        </PUIText>
      ))}
    </PUIScreen>
  ),
}
