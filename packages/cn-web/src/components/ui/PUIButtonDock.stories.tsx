import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUIButtonDock } from './PUIButtonDock'
import { PUIText } from './PUIText'

const meta = {
  title: 'PUI/Layout/ButtonDock',
  component: PUIButtonDock,
  tags: ['autodocs'],
  args: {
    children: null,
    layout: 'stack',
    position: 'sticky',
    topSpacing: true,
    elevated: true,
    'aria-label': 'Primary actions',
  },
  argTypes: {
    layout: { control: 'inline-radio', options: ['stack', 'split'] },
    position: { control: 'inline-radio', options: ['sticky', 'fixed', 'static'] },
    topSpacing: { control: 'boolean' },
    elevated: { control: 'boolean' },
  },
} satisfies Meta<typeof PUIButtonDock>

export default meta
type Story = StoryObj<typeof meta>

function ScrollFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-background relative mx-auto h-96 w-80 overflow-y-auto rounded-xl border">
      <div className="space-y-3 p-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <PUIText key={i} className="block" tone="muted" variant="callout">
            Content row {i + 1} scrolls behind the dock.
          </PUIText>
        ))}
      </div>
      {children}
    </div>
  )
}

export const Stack: Story = {
  render: (args) => (
    <ScrollFrame>
      <PUIButtonDock {...args}>
        <PUIButton fullWidth label="Continue" size="lg" />
      </PUIButtonDock>
    </ScrollFrame>
  ),
}

export const TwoActionsStacked: Story = {
  render: (args) => (
    <ScrollFrame>
      <PUIButtonDock {...args}>
        <PUIButton fullWidth label="Confirm booking" size="lg" />
        <PUIButton fullWidth label="Cancel" size="lg" variant="ghost" />
      </PUIButtonDock>
    </ScrollFrame>
  ),
}

export const Split: Story = {
  args: { layout: 'split' },
  render: (args) => (
    <ScrollFrame>
      <PUIButtonDock {...args}>
        <PUIButton fullWidth label="Back" size="lg" variant="outline" />
        <PUIButton fullWidth label="Next" size="lg" />
      </PUIButtonDock>
    </ScrollFrame>
  ),
}

export const WithAccessory: Story = {
  render: (args) => (
    <ScrollFrame>
      <PUIButtonDock
        {...args}
        accessory={
          <div className="flex items-baseline justify-between">
            <PUIText tone="muted" variant="footnote">
              Total
            </PUIText>
            <PUIText className="font-semibold" variant="callout">
              48.00 EUR
            </PUIText>
          </div>
        }
      >
        <PUIButton fullWidth label="Pay now" size="lg" />
      </PUIButtonDock>
    </ScrollFrame>
  ),
}

export const DestructiveStacking: Story = {
  render: (args) => (
    <ScrollFrame>
      <PUIButtonDock {...args} aria-label="Delete account actions">
        <PUIButton fullWidth label="Delete account" size="lg" variant="destructive" />
        <PUIButton fullWidth label="Keep account" size="lg" variant="ghost" />
      </PUIButtonDock>
    </ScrollFrame>
  ),
}

export const Flat: Story = {
  args: { elevated: false },
  render: (args) => (
    <ScrollFrame>
      <PUIButtonDock {...args}>
        <PUIButton fullWidth label="Save changes" size="lg" />
      </PUIButtonDock>
    </ScrollFrame>
  ),
}

export const Static: Story = {
  args: { position: 'static' },
  render: (args) => (
    <div className="border-border bg-background mx-auto w-80 rounded-xl border">
      <PUIButtonDock {...args}>
        <PUIButton fullWidth label="Continue" size="lg" />
      </PUIButtonDock>
    </div>
  ),
}
