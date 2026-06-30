import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PUIField, PUIForm } from './PUIField'
import { PUIInput } from './PUIInput'
import { PUISelect } from './PUISelect'

function FieldWithInput(props: { label: string; hint?: string; error?: string; disabled?: boolean }) {
  const [value, setValue] = useState('')
  return (
    <PUIField {...props}>
      {(field) => (
        <PUIInput
          aria-describedby={field.describedby}
          aria-invalid={field.invalid || undefined}
          disabled={field.disabled}
          id={field.id}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Jane Doe"
          value={value}
        />
      )}
    </PUIField>
  )
}

function FieldWithSelect() {
  const [value, setValue] = useState<string | null>(null)
  return (
    <PUIField hint="Pick the region closest to your team." label="Region">
      {(field) => (
        <PUISelect
          disabled={field.disabled}
          id={field.id}
          onValueChange={setValue}
          options={[
            { label: 'Europe', value: 'eu' },
            { label: 'North America', value: 'na' },
            { label: 'Asia Pacific', value: 'apac' },
          ]}
          placeholder="Select a region"
          value={value}
        />
      )}
    </PUIField>
  )
}

const meta = {
  title: 'PUI/Forms/Field',
  component: PUIField,
  tags: ['autodocs'],
  args: { children: () => null },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <FieldWithInput label="Name" /> }
export const WithHint: Story = {
  render: () => <FieldWithInput hint="As it should appear on the invoice." label="Full name" />,
}
export const WithError: Story = {
  render: () => <FieldWithInput error="This field is required." label="Name" />,
}
export const Disabled: Story = { render: () => <FieldWithInput disabled label="Name" /> }
export const WrappingSelect: Story = { render: () => <FieldWithSelect /> }
export const InAForm: Story = {
  render: () => (
    <PUIForm onSubmit={(e) => e.preventDefault()}>
      <FieldWithInput hint="As it should appear on the invoice." label="Full name" />
      <FieldWithSelect />
    </PUIForm>
  ),
}
