import * as React from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Trash2 } from 'lucide-react'

import { PUIButton } from './PUIButton'
import { PUIDialog, type PUIDialogProps } from './PUIDialog'

function Controlled({
  title,
  description,
  artwork,
  icon,
  artworkVariant,
  children,
  actions,
  role,
  alert,
  dismissible,
  errorSignal,
}: Partial<PUIDialogProps>) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex flex-col gap-3">
      <PUIButton className="self-start" onPress={() => setOpen(true)}>
        Open dialog
      </PUIButton>
      <PUIDialog
        actions={
          actions ?? (
            <>
              <PUIButton onPress={() => setOpen(false)} variant="outline">
                Cancel
              </PUIButton>
              <PUIButton onPress={() => setOpen(false)}>Confirm</PUIButton>
            </>
          )
        }
        alert={alert}
        artwork={artwork}
        artworkVariant={artworkVariant}
        description={description}
        dismissible={dismissible}
        errorSignal={errorSignal}
        icon={icon}
        onOpenChange={setOpen}
        open={open}
        role={role}
        title={title}
      >
        {children}
      </PUIDialog>
    </div>
  )
}

function ErrorShakeDemo() {
  const [open, setOpen] = React.useState(false)
  const [errorSignal, setErrorSignal] = React.useState(0)
  return (
    <div className="flex flex-col gap-3">
      <PUIButton className="self-start" onPress={() => setOpen(true)}>
        Open dialog
      </PUIButton>
      <PUIDialog
        actions={
          <>
            <PUIButton onPress={() => setOpen(false)} variant="outline">
              Cancel
            </PUIButton>
            <PUIButton onPress={() => setErrorSignal((signal) => signal + 1)}>
              Submit (rejected)
            </PUIButton>
          </>
        }
        description="Submitting fails and bumps errorSignal, which nudges the panel and springs back. Skipped under prefers-reduced-motion."
        errorSignal={errorSignal}
        onOpenChange={setOpen}
        open={open}
        role="alertdialog"
        title="Confirm changes"
      />
    </div>
  )
}

const meta = {
  title: 'PUI/Overlays/Dialog',
  component: PUIDialog,
  tags: ['autodocs'],
  args: { open: false, onOpenChange: () => {} },
} satisfies Meta<typeof PUIDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Confirm: Story = {
  render: () => (
    <Controlled
      description="This action cannot be undone. Are you sure you want to delete this item?"
      title="Delete item?"
    />
  ),
}

export const WithContent: Story = {
  render: () => (
    <Controlled description="We just need a couple of details." title="Edit profile">
      <p className="text-muted-foreground text-sm">Form fields would live here.</p>
    </Controlled>
  ),
}

export const NonDismissible: Story = {
  render: () => (
    <Controlled
      description="The backdrop and Escape will not close this dialog."
      dismissible={false}
      title="Action required"
    />
  ),
}

export const Alert: Story = {
  render: () => (
    <Controlled
      actions={
        <>
          <PUIButton variant="outline">Keep item</PUIButton>
          <PUIButton variant="destructive">Delete</PUIButton>
        </>
      }
      alert
      description="This permanently deletes the item. The backdrop, Escape and close button are disabled — confirm or cancel below."
      title="Delete item permanently?"
    />
  ),
}

export const AlertWithIcon: Story = {
  render: () => (
    <Controlled
      actions={
        <>
          <PUIButton variant="outline">Cancel</PUIButton>
          <PUIButton variant="destructive">Delete</PUIButton>
        </>
      }
      description="The icon above the title reinforces the destructive nature of this action."
      icon={
        <span className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-full">
          <Trash2 className="size-7" />
        </span>
      }
      role="alertdialog"
      title="Delete item permanently?"
    />
  ),
}

export const ErrorShake: Story = {
  render: () => <ErrorShakeDemo />,
}

export const WithHeroArtwork: Story = {
  render: () => (
    <Controlled
      actions={<PUIButton>Get started</PUIButton>}
      artwork={
        <div className="bg-primary text-primary-foreground flex h-40 w-full items-center justify-center">
          <span className="text-title-2 font-semibold">Welcome</span>
        </div>
      }
      artworkVariant="hero"
      description="A full-bleed hero banner sits above the title with rounded top corners."
      title="You're all set"
    />
  ),
}
