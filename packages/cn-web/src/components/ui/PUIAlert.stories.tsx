import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CheckCircle2 as CheckIcon,
  Info as InfoIcon,
  OctagonAlert as DangerIcon,
  TriangleAlert as WarningIcon,
} from 'lucide-react'
import { useState } from 'react'

import { PUIAlert } from './PUIAlert'
import { PUILinkText } from './PUILinkText'

const meta = {
  title: 'PUI/Feedback/Alert',
  component: PUIAlert,
  tags: ['autodocs'],
  args: { title: 'Heads up', children: 'This is an inline status banner.' },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIAlert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PUIAlert title="Draft saved">Your changes are stored locally until you publish.</PUIAlert>
  ),
}

export const Info: Story = {
  render: () => (
    <PUIAlert icon={<InfoIcon className="size-5" />} title="New version available" tone="info">
      Reload to get the latest catalog data.
    </PUIAlert>
  ),
}

export const Success: Story = {
  render: () => (
    <PUIAlert icon={<CheckIcon className="size-5" />} title="Profile updated" tone="success">
      Your details were saved successfully.
    </PUIAlert>
  ),
}

export const Warning: Story = {
  render: () => (
    <PUIAlert icon={<WarningIcon className="size-5" />} title="Connection unstable" tone="warning">
      Some changes may not have synced yet.
    </PUIAlert>
  ),
}

export const Danger: Story = {
  render: () => (
    <PUIAlert icon={<DangerIcon className="size-5" />} title="Payment failed" tone="danger">
      We could not charge your card. Update it to keep your subscription active.
    </PUIAlert>
  ),
}

export const WithAction: Story = {
  render: () => (
    <PUIAlert
      action={<PUILinkText href="#">Update payment method</PUILinkText>}
      icon={<DangerIcon className="size-5" />}
      title="Payment failed"
      tone="danger"
    >
      We could not charge your card.
    </PUIAlert>
  ),
}

export const Dismissible: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true)
    if (!open) return <PUILinkText href="#" onClick={() => setOpen(true)}>Show alert again</PUILinkText>
    return (
      <PUIAlert
        icon={<InfoIcon className="size-5" />}
        onClose={() => setOpen(false)}
        title="Tip"
        tone="info"
      >
        You can dismiss this banner.
      </PUIAlert>
    )
  },
}

export const TitleOnly: Story = {
  render: () => (
    <PUIAlert icon={<CheckIcon className="size-5" />} title="All systems operational" tone="success" />
  ),
}

export const BodyOnly: Story = {
  render: () => <PUIAlert>A quiet inline notice with no title and no icon.</PUIAlert>,
}
