import * as React from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUIPopover, type PUIPopoverProps } from './PUIPopover'

function Controlled({ side }: Partial<PUIPopoverProps>) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex min-h-60 items-center justify-center">
      <PUIPopover
        onOpenChange={setOpen}
        open={open}
        side={side}
        trigger={
          <PUIButton asChild variant="outline">
            <span>Open popover</span>
          </PUIButton>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-none font-semibold tracking-tight">Dimensions</p>
          <div className="bg-border h-px w-full" />
          <p className="text-muted-foreground text-sm">Set the width and height of the layer.</p>
          <PUIButton className="self-end" onPress={() => setOpen(false)} size="sm">
            Apply
          </PUIButton>
        </div>
      </PUIPopover>
    </div>
  )
}

const meta = {
  title: 'PUI/Overlays/Popover',
  component: PUIPopover,
  tags: ['autodocs'],
  args: { open: false, onOpenChange: () => {}, trigger: null, children: null },
} satisfies Meta<typeof PUIPopover>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled /> }
export const Top: Story = { render: () => <Controlled side="top" /> }
export const Right: Story = { render: () => <Controlled side="right" /> }
