import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PUICheckbox, type PUICheckboxProps } from './PUICheckbox'

function Controlled({ checked: initial = false, ...props }: Partial<PUICheckboxProps>) {
  const [checked, setChecked] = useState(initial)
  return <PUICheckbox checked={checked} onChange={setChecked} {...props} />
}

const meta = {
  title: 'PUI/Forms/Checkbox',
  component: PUICheckbox,
  tags: ['autodocs'],
  args: { checked: false },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUICheckbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled label="Accept the terms" /> }
export const Checked: Story = { render: () => <Controlled checked label="Subscribe to updates" /> }
export const WithError: Story = {
  render: () => <Controlled error="You must accept to continue" label="Accept the terms" />,
}
export const Disabled: Story = {
  render: () => <PUICheckbox checked={false} disabled label="Disabled option" />,
}
