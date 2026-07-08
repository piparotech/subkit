import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUISlider } from './PUISlider'

const meta = {
  title: 'PUI/Controls/Slider',
  component: PUISlider,
  tags: ['autodocs'],
  args: { value: 40 },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUISlider>

export default meta
type Story = StoryObj<typeof meta>

function Controlled({ step, disabled }: { step?: number; disabled?: boolean }) {
  const [value, setValue] = useState(40)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-foreground text-sm">{Math.round(value)}</span>
      <PUISlider disabled={disabled} onValueChange={setValue} step={step} value={value} />
    </div>
  )
}

export const Default: Story = { render: () => <Controlled /> }

export const Stepped: Story = { render: () => <Controlled step={10} /> }

export const Disabled: Story = { render: () => <Controlled disabled /> }
