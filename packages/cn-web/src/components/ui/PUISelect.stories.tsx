import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PUISelect, type PUISelectProps } from './PUISelect'

const FRUITS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Dragonfruit', value: 'dragonfruit' },
]

function Controlled({ value: initial = null, ...props }: Partial<PUISelectProps>) {
  const [value, setValue] = useState<string | null>(initial)
  return <PUISelect options={FRUITS} value={value} onValueChange={setValue} {...props} />
}

const meta = {
  title: 'PUI/Forms/Select',
  component: PUISelect,
  tags: ['autodocs'],
  args: { options: FRUITS, value: null, onValueChange: () => {} },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUISelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled placeholder="Select a fruit" /> }
export const WithValue: Story = { render: () => <Controlled value="banana" /> }
export const Disabled: Story = {
  render: () => (
    <PUISelect disabled options={FRUITS} placeholder="Select a fruit" value={null} onValueChange={() => {}} />
  ),
}
