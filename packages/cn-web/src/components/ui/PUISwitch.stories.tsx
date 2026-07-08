import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUISwitch, type PUISwitchProps } from './PUISwitch'

function Controlled({ value: initial = false, ...props }: Partial<PUISwitchProps>) {
  const [value, setValue] = useState(initial)
  return <PUISwitch onValueChange={setValue} value={value} {...props} />
}

const meta = {
  title: 'PUI/Forms/Switch',
  component: PUISwitch,
  tags: ['autodocs'],
  args: { value: false },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUISwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled /> }
export const On: Story = { render: () => <Controlled value /> }
export const WithLabel: Story = { render: () => <Controlled label="Enable notifications" /> }
export const Disabled: Story = {
  render: () => <PUISwitch disabled label="Disabled option" value={false} />,
}
export const DisabledOn: Story = {
  render: () => <PUISwitch disabled label="Disabled option" value={true} />,
}
