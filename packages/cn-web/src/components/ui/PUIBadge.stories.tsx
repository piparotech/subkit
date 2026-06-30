import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge } from './PUIBadge'

const meta = {
  title: 'PUI/Badge',
  component: PUIBadge,
  tags: ['autodocs'],
  args: { children: 'Badge' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'success', 'warning', 'info', 'outline'],
    },
    dot: { control: 'boolean' },
  },
} satisfies Meta<typeof PUIBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { children: 'Default' } }
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } }
export const Destructive: Story = { args: { children: 'Error', variant: 'destructive' } }
export const Success: Story = { args: { children: 'Active', variant: 'success' } }
export const Warning: Story = { args: { children: 'Pending', variant: 'warning' } }
export const Info: Story = { args: { children: 'Beta', variant: 'info' } }
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } }
export const WithDot: Story = {
  args: { children: 'Online', variant: 'success', dot: true, 'aria-label': 'Status: online' },
}
export const Count: Story = { args: { children: '12', variant: 'destructive' } }
