import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUISlidingButton, type PUISlidingButtonProps } from './PUISlidingButton'

const meta = {
  title: 'PUI/Actions/SlidingButton',
  component: PUISlidingButton,
  tags: ['autodocs'],
  args: {
    label: 'Slide to confirm',
    onConfirm: () => {},
    threshold: 'hard',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUISlidingButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const EasyThreshold: Story = {
  args: { label: 'Slide to unlock', threshold: 'easy' },
}

export const Disabled: Story = {
  args: { label: 'Slide to confirm', disabled: true },
}

export const Loading: Story = {
  args: { label: 'Processing', confirmedLabel: 'Processing', loading: true },
}

/** Drives the real confirm-to-loading-to-done lifecycle: confirm parks the thumb in a pending state, then re-arms. */
function Lifecycle(props: Partial<PUISlidingButtonProps>) {
  const [loading, setLoading] = useState(false)
  return (
    <PUISlidingButton
      label="Slide to pay"
      confirmedLabel="Charging card"
      threshold="hard"
      loading={loading}
      onConfirm={() => {
        setLoading(true)
        window.setTimeout(() => setLoading(false), 1800)
      }}
      {...props}
    />
  )
}

export const ConfirmThenProcess: Story = {
  render: () => <Lifecycle />,
}
