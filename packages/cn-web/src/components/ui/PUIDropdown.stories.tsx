import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PUIDropdown, type PUIDropdownItem } from './PUIDropdown'

const items: PUIDropdownItem[] = [
  { label: 'Edit', value: 'edit' },
  { label: 'Duplicate', value: 'duplicate' },
  { label: 'Delete', value: 'delete', destructive: true },
]

function Controlled({
  items: data = items,
  disabled,
}: {
  items?: PUIDropdownItem[]
  disabled?: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-3">
      <PUIDropdown
        disabled={disabled}
        items={data}
        onSelect={setSelected}
        triggerLabel="Open menu"
      />
      <p className="text-sm text-muted-foreground">Selected: {selected ?? 'none'}</p>
    </div>
  )
}

const meta = {
  title: 'PUI/Overlays/Dropdown',
  component: PUIDropdown,
  tags: ['autodocs'],
  args: { items, onSelect: () => {}, trigger: null },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIDropdown>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled /> }
export const Disabled: Story = { render: () => <Controlled disabled /> }
