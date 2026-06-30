import type { Meta, StoryObj } from '@storybook/react-vite'
import { Info } from 'lucide-react'

import { PUIButton } from './PUIButton'
import { PUITooltip } from './PUITooltip'

const meta = {
  title: 'PUI/Overlays/Tooltip',
  component: PUITooltip,
  tags: ['autodocs'],
  args: { content: 'Copied to clipboard', side: 'top', children: null },
  argTypes: {
    side: { control: 'inline-radio', options: ['top', 'bottom', 'left', 'right'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
  decorators: [
    (Story) => (
      <div className="flex justify-center p-24">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUITooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Top: Story = {
  args: { side: 'top', content: 'Shown above the trigger' },
  render: (args) => (
    <PUITooltip {...args}>
      <PUIButton variant="outline">Top</PUIButton>
    </PUITooltip>
  ),
}

export const Bottom: Story = {
  args: { side: 'bottom', content: 'Shown below the trigger' },
  render: (args) => (
    <PUITooltip {...args}>
      <PUIButton variant="outline">Bottom</PUIButton>
    </PUITooltip>
  ),
}

export const Left: Story = {
  args: { side: 'left', content: 'Shown left of the trigger' },
  render: (args) => (
    <PUITooltip {...args}>
      <PUIButton variant="outline">Left</PUIButton>
    </PUITooltip>
  ),
}

export const Right: Story = {
  args: { side: 'right', content: 'Shown right of the trigger' },
  render: (args) => (
    <PUITooltip {...args}>
      <PUIButton variant="outline">Right</PUIButton>
    </PUITooltip>
  ),
}

export const IconTrigger: Story = {
  args: {
    content: 'More information',
    accessibilityLabel: 'More information',
  },
  render: (args) => (
    <PUITooltip {...args}>
      <PUIButton aria-label="More information" size="icon" variant="ghost">
        <Info className="size-5" />
      </PUIButton>
    </PUITooltip>
  ),
}

export const Align: Story = {
  args: { side: 'bottom', content: 'Aligned to the trigger edge' },
  render: (args) => (
    <div className="flex gap-12">
      {(['start', 'center', 'end'] as const).map((align) => (
        <PUITooltip key={align} {...args} align={align}>
          <PUIButton variant="outline">align={align}</PUIButton>
        </PUITooltip>
      ))}
    </div>
  ),
}

export const LongContent: Story = {
  args: {
    side: 'top',
    content:
      'This tooltip carries a long, multi-sentence label that wraps onto several lines so the max-w-60 width cap is visible.',
  },
  render: (args) => (
    <PUITooltip {...args}>
      <PUIButton variant="outline">Long content</PUIButton>
    </PUITooltip>
  ),
}

export const CardTone: Story = {
  args: { tone: 'card', content: 'A light bubble with a soft shadow' },
  render: (args) => (
    <PUITooltip {...args}>
      <PUIButton variant="outline">Card tone</PUIButton>
    </PUITooltip>
  ),
}

export const Unprompted: Story = {
  args: {
    mode: 'unprompted',
    tone: 'card',
    content: 'New: pin your favourites for quick access',
    action: { label: 'Dismiss', onPress: () => {} },
  },
  render: (args) => (
    <PUITooltip {...args}>
      <PUIButton variant="outline">Saved items</PUIButton>
    </PUITooltip>
  ),
}
