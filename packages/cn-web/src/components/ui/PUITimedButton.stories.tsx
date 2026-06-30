import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUITimedButton, type PUITimedButtonProps } from './PUITimedButton'

/**
 * Auto mode with a working pause/resume toggle and a confirm counter. The toggle flips controlled
 * `running`; the badge proves `onConfirm` fired at 0 (or on a proactive click).
 */
function ControlledAuto(props: Partial<PUITimedButtonProps>) {
  const [running, setRunning] = useState(true)
  const [confirms, setConfirms] = useState(0)
  return (
    <div className="flex flex-col items-start gap-3">
      <PUITimedButton
        label="Keep me posted"
        {...props}
        mode="auto"
        onConfirm={() => setConfirms((count) => count + 1)}
        onPauseToggle={setRunning}
        running={running}
      />
      <p className="text-footnote text-muted-foreground">
        running: {String(running)} · confirmed {confirms}x
      </p>
    </div>
  )
}

/** Auto mode with a restart button that bumps `restartSignal` to re-arm the countdown. */
function ControlledRestart(props: Partial<PUITimedButtonProps>) {
  const [signal, setSignal] = useState(0)
  const [confirms, setConfirms] = useState(0)
  return (
    <div className="flex flex-col items-start gap-3">
      <PUITimedButton
        label="Apply suggested default"
        {...props}
        duration={6}
        mode="auto"
        onConfirm={() => setConfirms((count) => count + 1)}
        restartSignal={signal}
      />
      <div className="flex items-center gap-3">
        <button
          className="text-footnote text-primary focus-visible:ring-ring rounded-md px-2 py-1 font-medium focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => setSignal((value) => value + 1)}
          type="button"
        >
          Restart countdown
        </button>
        <span className="text-footnote text-muted-foreground">confirmed {confirms}x</span>
      </div>
    </div>
  )
}

/** Hold-to-confirm: press and hold (mouse, touch, or Space/Enter) to fill the ring; release cancels. */
function ControlledHold(props: Partial<PUITimedButtonProps>) {
  const [confirms, setConfirms] = useState(0)
  return (
    <div className="flex flex-col items-start gap-3">
      <PUITimedButton
        label="Hold to delete"
        {...props}
        duration={3}
        mode="hold"
        onConfirm={() => setConfirms((count) => count + 1)}
        variant="destructive"
      />
      <p className="text-footnote text-muted-foreground">confirmed {confirms}x</p>
    </div>
  )
}

const meta = {
  title: 'PUI/Actions/TimedButton',
  component: PUITimedButton,
  tags: ['autodocs'],
  args: { label: 'Keep me posted', onConfirm: () => {}, mode: 'auto', duration: 5 },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUITimedButton>

export default meta
type Story = StoryObj<typeof meta>

export const Auto: Story = { render: () => <ControlledAuto duration={8} /> }

export const AutoNonPausable: Story = {
  render: () => <ControlledAuto duration={8} pausable={false} />,
}

export const RestartOnSignal: Story = { render: () => <ControlledRestart /> }

export const HoldToConfirm: Story = { render: () => <ControlledHold /> }

export const Secondary: Story = {
  render: () => <ControlledAuto duration={8} variant="secondary" />,
}

export const Disabled: Story = {
  render: () => (
    <PUITimedButton disabled duration={8} label="Keep me posted" onConfirm={() => {}} />
  ),
}
