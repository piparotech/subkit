import * as React from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBanner, type PUIBannerProps } from './PUIBanner'
import { PUIButton } from './PUIButton'
import { PUILinkText } from './PUILinkText'

const meta = {
  title: 'PUI/Feedback/Banner',
  component: PUIBanner,
  tags: ['autodocs'],
  args: { title: 'Heads up', children: 'This is an inline page banner.' },
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {
  render: () => (
    <PUIBanner title="New version available" tone="info">
      Reload to get the latest catalog data.
    </PUIBanner>
  ),
}

export const Success: Story = {
  render: () => (
    <PUIBanner title="Profile updated" tone="success">
      Your details were saved successfully.
    </PUIBanner>
  ),
}

export const Warning: Story = {
  render: () => (
    <PUIBanner title="Connection unstable" tone="warning">
      Some changes may not have synced yet.
    </PUIBanner>
  ),
}

export const Error: Story = {
  render: () => (
    <PUIBanner title="Payment failed" tone="error">
      We could not charge your card. Update it to keep your subscription active.
    </PUIBanner>
  ),
}

export const Neutral: Story = {
  render: () => (
    <PUIBanner title="Read-only mode" tone="neutral">
      You have viewer access to this project.
    </PUIBanner>
  ),
}

export const Outline: Story = {
  render: () => (
    <PUIBanner title="Beta feature" tone="info" variant="outline">
      This area is still under active development.
    </PUIBanner>
  ),
}

export const WithActions: Story = {
  render: () => (
    <PUIBanner
      actions={
        <>
          <PUIButton onPress={() => {}} size="sm">
            Update payment
          </PUIButton>
          <PUILinkText href="#">Learn more</PUILinkText>
        </>
      }
      title="Payment failed"
      tone="error"
    >
      We could not charge your card.
    </PUIBanner>
  ),
}

function DismissibleBanner({ tone = 'info', title, children }: Partial<PUIBannerProps>) {
  const [visible, setVisible] = React.useState(true)
  if (!visible) {
    return (
      <PUILinkText href="#" onClick={() => setVisible(true)}>
        Show banner again
      </PUILinkText>
    )
  }
  return (
    <PUIBanner onDismiss={() => setVisible(false)} title={title} tone={tone}>
      {children}
    </PUIBanner>
  )
}

export const Dismissible: Story = {
  render: () => (
    <DismissibleBanner title="Tip" tone="info">
      You can dismiss this banner.
    </DismissibleBanner>
  ),
}

export const TitleOnly: Story = {
  render: () => <PUIBanner title="All systems operational" tone="success" />,
}

export const BodyOnly: Story = {
  render: () => (
    <PUIBanner icon={null} tone="neutral">
      A quiet inline notice with no title and no icon.
    </PUIBanner>
  ),
}
