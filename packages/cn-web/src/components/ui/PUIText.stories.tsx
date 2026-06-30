import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIText } from './PUIText'
import { type PUITextTone, type PUITextVariant } from './PUIText.types'

const VARIANTS: PUITextVariant[] = [
  'largeTitle',
  'title1',
  'title2',
  'title3',
  'headline',
  'body',
  'callout',
  'subheadline',
  'footnote',
  'caption1',
  'caption2',
]

const TONES: PUITextTone[] = ['default', 'muted', 'subtle', 'inverse', 'brand']

const meta = {
  title: 'PUI/Text',
  component: PUIText,
  tags: ['autodocs'],
  args: { children: 'The quick brown fox jumps over the lazy dog' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    tone: { control: 'select', options: TONES },
  },
} satisfies Meta<typeof PUIText>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TypeScale: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {VARIANTS.map((variant) => (
        <PUIText key={variant} variant={variant}>
          {variant}
        </PUIText>
      ))}
    </div>
  ),
}

export const Tones: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      {TONES.map((tone) => (
        <span key={tone} className={tone === 'inverse' ? 'rounded-md bg-foreground p-2' : undefined}>
          <PUIText tone={tone}>{tone}</PUIText>
        </span>
      ))}
    </div>
  ),
}
