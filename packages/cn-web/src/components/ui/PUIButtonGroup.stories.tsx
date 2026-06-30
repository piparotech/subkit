import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayoutGrid, List, Map } from 'lucide-react'

import { PUIButtonGroup, type PUIButtonGroupProps } from './PUIButtonGroup'

const VIEW_ITEMS = [
  { value: 'list', label: 'List', leadingIcon: List },
  { value: 'grid', label: 'Grid', leadingIcon: LayoutGrid },
  { value: 'map', label: 'Map', leadingIcon: Map },
]

const FILTER_ITEMS = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
]

function SingleControlled({
  value: initial = 'list',
  ...props
}: Partial<PUIButtonGroupProps> & { value?: string }) {
  const [value, setValue] = useState<string>(initial)
  return (
    <PUIButtonGroup
      items={VIEW_ITEMS}
      onValueChange={(next) => setValue(next as string)}
      value={value}
      {...props}
    />
  )
}

function MultiControlled(props: Partial<PUIButtonGroupProps>) {
  const [value, setValue] = useState<string[]>(['open'])
  return (
    <PUIButtonGroup
      items={FILTER_ITEMS}
      onValueChange={(next) => setValue(next as string[])}
      selection="multiple"
      value={value}
      {...props}
    />
  )
}

const meta = {
  title: 'PUI/Button/ButtonGroup',
  component: PUIButtonGroup,
  tags: ['autodocs'],
  args: { items: VIEW_ITEMS, value: 'list', 'aria-label': 'View mode' },
  argTypes: {
    mode: { control: 'inline-radio', options: ['select', 'action'] },
    selection: { control: 'inline-radio', options: ['single', 'multiple'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof PUIButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

export const SingleSelect: Story = {
  render: () => <SingleControlled aria-label="View mode" />,
}

export const MultiSelect: Story = {
  render: () => <MultiControlled aria-label="Status filter" />,
}

export const Small: Story = {
  render: () => <SingleControlled aria-label="View mode" size="sm" />,
}

export const ActionMode: Story = {
  render: () => (
    <PUIButtonGroup
      aria-label="Text alignment"
      items={[
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ]}
      mode="action"
      onAction={(value) => window.alert(`Align ${value}`)}
    />
  ),
}

export const ItemDisabled: Story = {
  render: () => (
    <SingleControlled
      aria-label="View mode"
      items={[
        { value: 'list', label: 'List', leadingIcon: List },
        { value: 'grid', label: 'Grid', leadingIcon: LayoutGrid, disabled: true },
        { value: 'map', label: 'Map', leadingIcon: Map },
      ]}
    />
  ),
}

export const Disabled: Story = {
  render: () => <PUIButtonGroup aria-label="View mode" disabled items={VIEW_ITEMS} value="grid" />,
}
