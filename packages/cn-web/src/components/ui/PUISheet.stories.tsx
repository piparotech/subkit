import * as React from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUISheet } from './PUISheet'
import type { PUISheetProps } from './PUISheet.types'

function Controlled({
  title,
  children,
  side,
  size,
  showGrabber,
  dismissibleByDrag,
}: Partial<PUISheetProps>) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex flex-col gap-3">
      <PUIButton className="self-start" onPress={() => setOpen(true)}>
        Open sheet
      </PUIButton>
      <PUISheet
        dismissibleByDrag={dismissibleByDrag}
        onOpenChange={setOpen}
        open={open}
        showGrabber={showGrabber}
        side={side}
        size={size}
        title={title}
      >
        {children ?? (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              Press Escape or click the backdrop to dismiss.
            </p>
            <PUIButton className="self-end" onPress={() => setOpen(false)}>
              Done
            </PUIButton>
          </div>
        )}
      </PUISheet>
    </div>
  )
}

const meta = {
  title: 'PUI/Overlays/Sheet',
  component: PUISheet,
  tags: ['autodocs'],
  args: { open: false, onOpenChange: () => {}, children: null },
} satisfies Meta<typeof PUISheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled /> }

export const WithTitle: Story = { render: () => <Controlled title="Filters" /> }

export const SizeSmall: Story = { render: () => <Controlled size="sm" title="Quick action" /> }

export const SizeLarge: Story = { render: () => <Controlled size="lg" title="Details" /> }

export const SizeFull: Story = { render: () => <Controlled size="full" title="Full height" /> }

export const RightDrawer: Story = {
  render: () => <Controlled side="right" title="Navigation" />,
}

export const LeftDrawer: Story = {
  render: () => <Controlled side="left" title="Filters" />,
}

export const RightDrawerLarge: Story = {
  render: () => <Controlled side="right" size="lg" title="Cart" />,
}

export const DragToDismiss: Story = {
  render: () => (
    <Controlled dismissibleByDrag title="Filters">
      <p className="text-muted-foreground text-sm">
        Drag the handle down to close, or press Escape or click the backdrop to dismiss.
      </p>
    </Controlled>
  ),
}

export const LongContent: Story = {
  render: () => (
    <Controlled size="lg" title="Terms of service">
      <div className="flex flex-col gap-4">
        {Array.from({ length: 20 }, (_, i) => (
          <p className="text-muted-foreground text-sm" key={i}>
            {`Section ${i + 1}. `}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        ))}
      </div>
    </Controlled>
  ),
}

export const NoGrabber: Story = {
  render: () => <Controlled showGrabber={false} title="No handle" />,
}
