import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bike, CreditCard, Truck, Wallet } from 'lucide-react'

import { PUITile, PUITileGroup } from './PUITile'

const meta = {
  title: 'PUI/Selection/Tile',
  component: PUITile,
  tags: ['autodocs'],
  args: {
    label: 'Standard delivery',
    description: 'Arrives in 3 to 5 business days',
    trailing: 'radio',
    selected: false,
  },
  argTypes: {
    kind: { control: 'inline-radio', options: ['selection', 'action'] },
    trailing: { control: 'inline-radio', options: ['radio', 'check', 'switch', 'chevron'] },
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUITile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = {
  args: { label: 'Express delivery', description: 'Arrives tomorrow', selected: true },
}

export const WithLeadingIcon: Story = {
  args: {
    label: 'Bike courier',
    description: 'Fastest within the city',
    leading: <Bike className="text-foreground size-6" />,
    selected: true,
  },
}

export const CheckTrailing: Story = {
  args: {
    label: 'Save card for later',
    description: 'You can remove it any time',
    trailing: 'check',
    selectionMode: 'multiple',
    selected: true,
  },
}

export const SwitchTrailing: Story = {
  args: {
    label: 'Leave at the door',
    description: 'No signature required',
    trailing: 'switch',
    selectionMode: 'multiple',
    selected: true,
  },
}

export const ActionNav: Story = {
  args: {
    kind: 'action',
    label: 'Payment methods',
    description: 'Cards, wallets and bank transfer',
    trailing: 'chevron',
    leading: <CreditCard className="text-foreground size-6" />,
  },
}

export const Disabled: Story = {
  args: { label: 'Same-day delivery', description: 'Not available in your area', disabled: true },
}

const DELIVERY_OPTIONS = [
  {
    value: 'standard',
    label: 'Standard delivery',
    description: 'Arrives in 3 to 5 business days',
    leading: <Truck className="text-foreground size-6" />,
  },
  {
    value: 'express',
    label: 'Express delivery',
    description: 'Arrives tomorrow',
    leading: <Bike className="text-foreground size-6" />,
  },
  {
    value: 'pickup',
    label: 'Local pickup',
    description: 'Collect from a nearby point',
    leading: <Wallet className="text-foreground size-6" />,
  },
]

function SingleSelectControlled() {
  const [value, setValue] = useState('express')
  return (
    <PUITileGroup
      aria-label="Delivery method"
      onValueChange={setValue}
      options={DELIVERY_OPTIONS}
      value={value}
    />
  )
}

export const SingleSelectGroup: Story = {
  render: () => <SingleSelectControlled />,
}

const PREFERENCE_OPTIONS = [
  { value: 'contactless', label: 'Contactless drop-off' },
  { value: 'leave-door', label: 'Leave at the door' },
  { value: 'signature', label: 'Require a signature' },
  { value: 'photo', label: 'Photo on delivery' },
]

function MultiSelectControlled() {
  const [values, setValues] = useState<string[]>(['contactless'])
  return (
    <PUITileGroup
      aria-label="Delivery preferences"
      layout="grid"
      mode="multiple"
      onValuesChange={setValues}
      options={PREFERENCE_OPTIONS}
      selectionHint="Select any that apply"
      values={values}
    />
  )
}

export const MultiSelectGrid: Story = {
  render: () => <MultiSelectControlled />,
}
