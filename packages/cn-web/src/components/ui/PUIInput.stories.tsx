import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIEmailInput } from './PUIEmailInput'
import { PUIInput, type PUIInputProps } from './PUIInput'
import { PUIPasswordInput } from './PUIPasswordInput'

function Controlled(props: PUIInputProps) {
  const [value, setValue] = useState('')
  return <PUIInput onChange={(e) => setValue(e.target.value)} value={value} {...props} />
}

function ControlledEmail() {
  const [value, setValue] = useState('')
  return (
    <PUIEmailInput
      label="Email"
      onChange={(e) => setValue(e.target.value)}
      placeholder="you@piparo.tech"
      value={value}
    />
  )
}

function ControlledPassword() {
  const [value, setValue] = useState('')
  return (
    <PUIPasswordInput
      label="Password"
      onChange={(e) => setValue(e.target.value)}
      placeholder="••••••••"
      value={value}
    />
  )
}

const meta = {
  title: 'PUI/Forms/Input',
  component: PUIInput,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled label="Name" placeholder="Jane Doe" /> }
export const WithError: Story = {
  render: () => <Controlled error="This field is required" label="Name" placeholder="Jane Doe" />,
}
export const Disabled: Story = {
  render: () => <Controlled disabled label="Name" placeholder="Jane Doe" />,
}
export const Email: Story = { render: () => <ControlledEmail /> }
export const Password: Story = { render: () => <ControlledPassword /> }
