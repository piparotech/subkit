import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUICombobox, type PUIComboboxProps } from './PUICombobox'

const FRUITS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Dragonfruit', value: 'dragonfruit' },
  { label: 'Elderberry', value: 'elderberry' },
  { label: 'Fig', value: 'fig' },
  { label: 'Grapefruit', value: 'grapefruit' },
]

function Controlled({ value: initial = null, ...props }: Partial<PUIComboboxProps>) {
  const [value, setValue] = useState<string | null>(initial)
  return <PUICombobox options={FRUITS} value={value} onValueChange={setValue} {...props} />
}

const meta = {
  title: 'PUI/Forms/Combobox',
  component: PUICombobox,
  tags: ['autodocs'],
  args: { options: FRUITS, value: null, onValueChange: () => {} },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUICombobox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Controlled placeholder="Select a fruit" searchPlaceholder="Search fruit…" />,
}
export const WithValue: Story = { render: () => <Controlled value="banana" /> }
export const Disabled: Story = {
  render: () => (
    <PUICombobox
      disabled
      options={FRUITS}
      placeholder="Select a fruit"
      value={null}
      onValueChange={() => {}}
    />
  ),
}
