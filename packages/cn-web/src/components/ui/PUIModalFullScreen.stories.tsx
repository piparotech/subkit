import * as React from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUIInput } from './PUIInput'
import { PUIModalFullScreen, type PUIModalFullScreenProps } from './PUIModalFullScreen'

function Controlled({
  footer,
  children,
  ...props
}: Partial<PUIModalFullScreenProps> & { title: PUIModalFullScreenProps['title'] }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex flex-col gap-3">
      <PUIButton className="self-start" onPress={() => setOpen(true)}>
        Open takeover
      </PUIButton>
      <PUIModalFullScreen
        footer={
          footer ?? (
            <PUIButton fullWidth onPress={() => setOpen(false)}>
              Done
            </PUIButton>
          )
        }
        {...props}
        onOpenChange={setOpen}
        open={open}
      >
        {children ?? <SampleForm />}
      </PUIModalFullScreen>
    </div>
  )
}

function SampleForm() {
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <p className="text-callout text-muted-foreground">
        Complete the steps below. The header close control and the Escape key both request
        dismissal.
      </p>
      {Array.from({ length: 8 }).map((_, index) => (
        <label className="flex flex-col gap-1.5" key={index}>
          <span className="text-subheadline text-foreground font-medium">Field {index + 1}</span>
          <PUIInput placeholder={`Value ${index + 1}`} />
        </label>
      ))}
    </div>
  )
}

const meta = {
  title: 'PUI/Overlays/ModalFullScreen',
  component: PUIModalFullScreen,
  tags: ['autodocs'],
  args: { open: false, onOpenChange: () => {}, title: 'Create account', children: null },
} satisfies Meta<typeof PUIModalFullScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Immersive: Story = {
  render: () => <Controlled title="Create account" />,
}

export const Stacked: Story = {
  render: () => <Controlled presentation="stacked" title="Edit profile" />,
}

export const WithHeaderAction: Story = {
  render: () => (
    <Controlled
      headerAction={{ label: 'Skip', onPress: () => {} }}
      leadingAction="back"
      title="Add payment method"
    />
  ),
}

export const ConfirmOnClose: Story = {
  render: () => <Controlled confirmOnClose title="New listing" />,
}

export const CustomConfirmCopy: Story = {
  render: () => (
    <Controlled
      confirmOnClose={{
        title: 'Leave without saving?',
        message: 'Your draft listing has not been published yet and will be discarded.',
        confirmLabel: 'Leave',
        cancelLabel: 'Stay',
      }}
      title="New listing"
    />
  ),
}

export const NonScrolling: Story = {
  render: () => (
    <Controlled scrollable={false} title="Scan code">
      <div className="flex h-full items-center justify-center">
        <p className="text-callout text-muted-foreground">Fixed, non-scrolling task surface.</p>
      </div>
    </Controlled>
  ),
}
