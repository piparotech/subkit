import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIPinInput, type PUIPinInputProps } from './PUIPinInput'

function Controlled(props: Omit<PUIPinInputProps, 'value' | 'onChange'>) {
  const [value, setValue] = useState('')
  return <PUIPinInput onChange={setValue} value={value} {...props} />
}

function ControlledComplete() {
  const [value, setValue] = useState('')
  const [done, setDone] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <PUIPinInput onChange={setValue} onComplete={setDone} value={value} />
      <span className="text-footnote text-muted-foreground">
        {done != null ? `Completed: ${done}` : 'Enter 6 digits'}
      </span>
    </div>
  )
}

const meta = {
  title: 'PUI/Forms/PinInput',
  component: PUIPinInput,
  tags: ['autodocs'],
  args: { value: '' },
} satisfies Meta<typeof PUIPinInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled /> }

export const FourDigits: Story = { render: () => <Controlled length={4} /> }

export const Masked: Story = { render: () => <Controlled mask /> }

export const WithError: Story = { render: () => <Controlled error /> }

export const Disabled: Story = { render: () => <Controlled disabled /> }

export const Autofocus: Story = { render: () => <Controlled autoFocus /> }

export const OnComplete: Story = { render: () => <ControlledComplete /> }
