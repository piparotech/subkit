import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  type PUIDateRange,
  PUIDateRangePicker,
  type PUIDateRangePickerProps,
} from './PUIDateRangePicker'
import { PUIField } from './PUIField'

function Controlled({ value: initial, ...props }: Partial<PUIDateRangePickerProps>) {
  const [value, setValue] = useState<PUIDateRange>(initial ?? { start: null, end: null })
  return <PUIDateRangePicker value={value} onChange={setValue} {...props} />
}

const meta = {
  title: 'PUI/Forms/DateRangePicker',
  component: PUIDateRangePicker,
  tags: ['autodocs'],
  args: { value: { start: null, end: null } },
  decorators: [
    (Story) => (
      <div className="min-h-[28rem] w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIDateRangePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  render: () => <Controlled accessibilityLabel="Pick a date range" />,
}

export const Preselected: Story = {
  render: () => (
    <Controlled
      accessibilityLabel="Pick a date range"
      value={{ start: new Date(2026, 5, 8), end: new Date(2026, 5, 19) }}
    />
  ),
}

export const SingleDay: Story = {
  name: 'Single day',
  render: () => (
    <Controlled
      accessibilityLabel="Pick a date range"
      value={{ start: new Date(2026, 5, 12), end: new Date(2026, 5, 12) }}
    />
  ),
}

export const Bounded: Story = {
  render: () => (
    <Controlled
      accessibilityLabel="Pick a date range"
      maximumDate={new Date(2026, 5, 28)}
      minimumDate={new Date(2026, 5, 1)}
    />
  ),
}

export const NotFullWidth: Story = {
  name: 'Not full width',
  render: () => (
    <Controlled
      accessibilityLabel="Pick a date range"
      fullWidth={false}
      value={{ start: new Date(2026, 5, 8), end: new Date(2026, 5, 19) }}
    />
  ),
}

export const Error_: Story = {
  name: 'Error',
  render: () => <Controlled accessibilityLabel="Pick a date range" error />,
}

export const Disabled: Story = {
  render: () => (
    <PUIDateRangePicker
      accessibilityLabel="Pick a date range"
      disabled
      value={{ start: new Date(2026, 5, 8), end: new Date(2026, 5, 19) }}
    />
  ),
}

export const InPUIField: Story = {
  name: 'In PUIField',
  render: () => {
    function Field() {
      const [value, setValue] = useState<PUIDateRange>({ start: null, end: null })
      return (
        <PUIField
          error="Pick a date range to continue."
          hint="When should the booking start and end?"
          label="Booking window"
        >
          {(field) => (
            <PUIDateRangePicker
              accessibilityLabel="Booking window"
              aria-describedby={field.describedby}
              error={field.invalid}
              id={field.id}
              onChange={setValue}
              value={value}
            />
          )}
        </PUIField>
      )
    }
    return <Field />
  },
}
