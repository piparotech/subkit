import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Rabbit, Snail, Zap } from 'lucide-react'

import { PUIRadioGroup, type PUIRadioGroupProps } from './PUIRadioGroup'

const plans = [
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

const plansWithDescriptions = [
  { value: 'starter', label: 'Starter', description: 'For individuals getting started.' },
  { value: 'pro', label: 'Pro', description: 'For small teams that ship often.' },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'Advanced controls and dedicated support.',
  },
]

function Controlled({ value: initial, ...props }: Partial<PUIRadioGroupProps>) {
  const [value, setValue] = useState<string | undefined>(initial)
  return <PUIRadioGroup onValueChange={setValue} options={plans} value={value} {...props} />
}

const meta = {
  title: 'PUI/Forms/RadioGroup',
  component: PUIRadioGroup,
  tags: ['autodocs'],
  args: { options: plans },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIRadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled label="Plan" /> }
export const Selected: Story = { render: () => <Controlled label="Plan" value="pro" /> }
export const WithError: Story = {
  render: () => <Controlled error="Select a plan to continue" label="Plan" />,
}
export const DisabledOption: Story = {
  render: () => (
    <Controlled
      label="Plan"
      options={[
        { value: 'starter', label: 'Starter' },
        { value: 'pro', label: 'Pro' },
        { value: 'enterprise', label: 'Enterprise (contact sales)', disabled: true },
      ]}
      value="starter"
    />
  ),
}
export const DisabledGroup: Story = {
  render: () => <Controlled disabled label="Plan" value="pro" />,
}
export const WithDescriptions: Story = {
  render: () => <Controlled label="Plan" options={plansWithDescriptions} value="pro" />,
}
export const Tile: Story = {
  render: () => (
    <Controlled label="Plan" options={plansWithDescriptions} value="pro" variant="tile" />
  ),
}

const speedTiers = [
  {
    value: 'fast',
    label: 'Fast',
    description: 'Funded in minutes. 12-month term at the highest rate.',
    leading: <Zap aria-hidden className="text-foreground size-5" />,
  },
  {
    value: 'normal',
    label: 'Normal',
    description: 'Funded within a day. 24-month term, balanced rate.',
    leading: <Rabbit aria-hidden className="text-foreground size-5" />,
  },
  {
    value: 'slow',
    label: 'Slow',
    description: 'Funded in a few days. 36-month term at the lowest rate.',
    leading: <Snail aria-hidden className="text-foreground size-5" />,
  },
]

export const TileWithLeadingIcon: Story = {
  render: () => (
    <Controlled label="Repayment speed" options={speedTiers} value="normal" variant="tile" />
  ),
}
