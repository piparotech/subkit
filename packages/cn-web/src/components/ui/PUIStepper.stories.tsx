import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIStepper, type PUIStepperProps } from './PUIStepper'

function Controlled({ value: initial = 1, ...props }: Partial<PUIStepperProps>) {
  const [value, setValue] = useState(initial)
  return <PUIStepper onValueChange={setValue} value={value} {...props} />
}

const meta = {
  title: 'PUI/Form/Stepper',
  component: PUIStepper,
  tags: ['autodocs'],
  args: { value: 1, min: 0, max: 99, step: 1, label: 'Quantity' },
  argTypes: {
    value: { control: { type: 'number' } },
    min: { control: { type: 'number' } },
    max: { control: { type: 'number' } },
    step: { control: { type: 'number' } },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
} satisfies Meta<typeof PUIStepper>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: (args) => <Controlled {...args} /> }

export const AtMinimum: Story = {
  render: (args) => <Controlled {...args} value={0} min={0} max={5} />,
}

export const AtMaximum: Story = {
  render: (args) => <Controlled {...args} value={5} min={0} max={5} />,
}

export const StepOfFive: Story = {
  render: (args) => <Controlled {...args} value={10} min={0} max={50} step={5} />,
}

export const FullWidth: Story = {
  render: (args) => (
    <div className="w-72">
      <Controlled {...args} fullWidth />
    </div>
  ),
}

export const Disabled: Story = {
  render: (args) => <PUIStepper {...args} value={3} disabled />,
}
