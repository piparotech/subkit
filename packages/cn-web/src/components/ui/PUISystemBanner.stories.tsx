import * as React from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  OctagonAlert as ErrorIcon,
  Info as InfoIcon,
  CheckCircle2 as SuccessIcon,
  TriangleAlert as WarningIcon,
} from 'lucide-react'

import { PUIButton } from './PUIButton'
import { PUISystemBanner, type PUISystemBannerProps } from './PUISystemBanner'

function Controlled({ message, ...props }: Partial<PUISystemBannerProps>) {
  const [visible, setVisible] = React.useState(true)
  return (
    <div className="flex flex-col gap-4">
      <PUISystemBanner
        message={message ?? 'Maintenance is scheduled for tonight at 23:00 UTC.'}
        onDismiss={() => setVisible(false)}
        visible={visible}
        {...props}
      />
      {!visible ? (
        <PUIButton className="self-start" onPress={() => setVisible(true)} variant="outline">
          Show banner again
        </PUIButton>
      ) : null}
    </div>
  )
}

const meta = {
  title: 'PUI/Feedback/SystemBanner',
  component: PUISystemBanner,
  tags: ['autodocs'],
  args: { message: 'Maintenance is scheduled for tonight at 23:00 UTC.', intent: 'info' },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PUISystemBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {
  render: () => (
    <PUISystemBanner
      icon={<InfoIcon className="size-5" />}
      intent="info"
      message="A new version of the app is available. Reload to update."
    />
  ),
}

export const Warning: Story = {
  render: () => (
    <PUISystemBanner
      icon={<WarningIcon className="size-5" />}
      intent="warning"
      message="Your connection is unstable. Some changes may not have synced yet."
    />
  ),
}

export const Error: Story = {
  render: () => (
    <PUISystemBanner
      icon={<ErrorIcon className="size-5" />}
      intent="error"
      message="You are offline. We will reconnect automatically when your network returns."
    />
  ),
}

export const Success: Story = {
  render: () => (
    <PUISystemBanner
      icon={<SuccessIcon className="size-5" />}
      intent="success"
      message="All systems operational. Your data is fully synced."
    />
  ),
}

export const WithAction: Story = {
  render: () => (
    <PUISystemBanner
      actions={[{ label: 'Reload', onPress: () => {} }]}
      icon={<InfoIcon className="size-5" />}
      intent="info"
      message="A new version is available."
    />
  ),
}

export const WithActionsAndDismiss: Story = {
  render: () => (
    <Controlled
      actions={[
        { label: 'Retry', onPress: () => {} },
        { label: 'Details', onPress: () => {} },
      ]}
      icon={<WarningIcon className="size-5" />}
      intent="warning"
      message="We could not reach the server."
    />
  ),
}

export const Dismissible: Story = {
  render: () => (
    <Controlled
      icon={<ErrorIcon className="size-5" />}
      intent="error"
      message="Your session is about to expire."
    />
  ),
}

export const PinnedToTop: Story = {
  render: () => (
    <div className="border-border bg-background relative h-64 overflow-hidden rounded-xl border">
      <PUISystemBanner
        className="absolute inset-x-0 top-0"
        icon={<InfoIcon className="size-5" />}
        intent="info"
        message="Pinned to the top of its scroll container via className."
      />
      <div className="text-callout text-muted-foreground px-4 pt-20 pb-4">
        Page content scrolls under the pinned banner. The host owns placement; pass
        <code className="px-1">sticky top-0</code> or <code className="px-1">fixed</code> in
        <code className="px-1">className</code>.
      </div>
    </div>
  ),
}

export const TextOnly: Story = {
  render: () => (
    <PUISystemBanner intent="info" message="A minimal banner with no icon, action, or dismiss." />
  ),
}
