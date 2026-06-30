import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIDatePicker, type PUIDatePickerProps } from './PUIDatePicker'

function Controlled({ value: initial, ...props }: Partial<PUIDatePickerProps>) {
  const [value, setValue] = useState(initial ?? new Date(2026, 5, 20, 14, 30))
  return <PUIDatePicker value={value} onChange={setValue} {...props} />
}

const meta = {
  title: 'PUI/Forms/DatePicker',
  component: PUIDatePicker,
  tags: ['autodocs'],
  args: { value: new Date(2026, 5, 20, 14, 30) },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIDatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Date_: Story = {
  name: 'Date',
  render: () => <Controlled accessibilityLabel="Pick a date" mode="date" />,
}
export const Time: Story = {
  render: () => <Controlled accessibilityLabel="Pick a time" mode="time" />,
}
export const DateTime: Story = {
  render: () => <Controlled accessibilityLabel="Pick date and time" mode="datetime" />,
}
export const Disabled: Story = {
  render: () => (
    <PUIDatePicker accessibilityLabel="Pick a date" disabled value={new Date(2026, 5, 20)} />
  ),
}

export const Error: Story = {
  render: () => <Controlled accessibilityLabel="Pick a date" error mode="date" />,
}

export const Compact: Story = {
  name: 'Compact (hug width)',
  render: () => <Controlled accessibilityLabel="Pick a date" fullWidth={false} mode="date" />,
}

export const MinMaxRange: Story = {
  name: 'Min / max range',
  render: () => (
    <Controlled
      accessibilityLabel="Pick a date within range"
      maximumDate={new Date(2026, 5, 27)}
      minimumDate={new Date(2026, 5, 10)}
      mode="date"
      value={new Date(2026, 5, 20)}
    />
  ),
}

export const Birthday: Story = {
  name: 'Birthday (far-back year-jump)',
  render: () => (
    <Controlled
      accessibilityLabel="Date of birth"
      maximumDate={new Date()}
      mode="date"
      value={new Date(1985, 6, 14)}
    />
  ),
}
