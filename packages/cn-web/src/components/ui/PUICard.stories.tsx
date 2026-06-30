import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import {
  PUICard,
  PUICardContent,
  PUICardDescription,
  PUICardFooter,
  PUICardHeader,
  PUICardTitle,
} from './PUICard'

const meta = {
  title: 'PUI/Card',
  component: PUICard,
  tags: ['autodocs'],
} satisfies Meta<typeof PUICard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PUICard className="w-80">
      <PUICardHeader>
        <PUICardTitle>piparo cn-web</PUICardTitle>
        <PUICardDescription>Token-driven via @piparo/design-tokens</PUICardDescription>
      </PUICardHeader>
      <PUICardContent>Semantic tokens only, re-brand by swapping the token set.</PUICardContent>
      <PUICardFooter>
        <PUIButton>Action</PUIButton>
      </PUICardFooter>
    </PUICard>
  ),
}
