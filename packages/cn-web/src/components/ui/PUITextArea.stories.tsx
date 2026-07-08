import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUITextArea, type PUITextAreaProps } from './PUITextArea'

function Controlled(props: PUITextAreaProps) {
  const [value, setValue] = useState('')
  return <PUITextArea onChange={(e) => setValue(e.target.value)} value={value} {...props} />
}

const meta = {
  title: 'PUI/Forms/TextArea',
  component: PUITextArea,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUITextArea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Controlled label="Notes" placeholder="Write a short note" />,
}
export const WithHint: Story = {
  render: () => (
    <Controlled hint="Markdown is supported." label="Notes" placeholder="Write a short note" />
  ),
}
export const WithError: Story = {
  render: () => (
    <Controlled error="This field is required" label="Notes" placeholder="Write a short note" />
  ),
}
export const AutoGrow: Story = {
  render: () => <Controlled autoGrow label="Notes" placeholder="Grows as you type" />,
}
export const Disabled: Story = {
  render: () => <Controlled disabled label="Notes" placeholder="Write a short note" />,
}
