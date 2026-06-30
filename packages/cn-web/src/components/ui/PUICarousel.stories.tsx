import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUICard, PUICardContent, PUICardDescription, PUICardHeader, PUICardTitle } from './PUICard'
import { PUICarousel } from './PUICarousel'

const SLIDES = ['Discover', 'Organize', 'Ship'].map((title, i) => (
  <PUICard key={title} className="mx-1">
    <PUICardHeader>
      <PUICardTitle>{title}</PUICardTitle>
      <PUICardDescription>{`Slide ${i + 1} of 3`}</PUICardDescription>
    </PUICardHeader>
    <PUICardContent>
      <PUICardDescription>Scroll sideways, tap a dot, or use the arrow keys.</PUICardDescription>
    </PUICardContent>
  </PUICard>
))

const meta = {
  title: 'PUI/Layout/Carousel',
  component: PUICarousel,
  tags: ['autodocs'],
  args: { items: SLIDES },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUICarousel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Loop: Story = { args: { loop: true } }

export const NoIndicators: Story = { args: { showIndicators: false } }
