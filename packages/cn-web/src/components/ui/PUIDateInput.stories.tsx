import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIDateInput, type PUIDateInputProps } from './PUIDateInput'

function Controlled({ value: initial = null, ...props }: Partial<PUIDateInputProps>) {
  const [value, setValue] = useState<Date | null>(initial)
  return <PUIDateInput value={value} onChange={setValue} {...props} />
}

const meta = {
  title: 'PUI/Forms/DateInput',
  component: PUIDateInput,
  tags: ['autodocs'],
  args: { value: null },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIDateInput>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  render: () => <Controlled accessibilityLabel="Date of birth" />,
}

export const Prefilled: Story = {
  render: () => <Controlled accessibilityLabel="Date of birth" value={new Date(2026, 5, 20)} />,
}

export const WithRange: Story = {
  name: 'Min / Max window',
  render: () => (
    <Controlled
      accessibilityLabel="Booking date"
      maximumDate={new Date(2026, 11, 31)}
      minimumDate={new Date(2026, 0, 1)}
    />
  ),
}

export const WithError: Story = {
  render: () => (
    <Controlled accessibilityLabel="Date of birth" error errorMessage="Please enter a valid date" />
  ),
}

export const Compact: Story = {
  render: () => <Controlled accessibilityLabel="Date" fullWidth={false} />,
}

export const Disabled: Story = {
  render: () => (
    <PUIDateInput accessibilityLabel="Date of birth" disabled value={new Date(2026, 5, 20)} />
  ),
}
