import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, Hash, Star } from 'lucide-react'

import { PUITag } from './PUITag'

const meta = {
  title: 'PUI/Tag',
  component: PUITag,
  tags: ['autodocs'],
  args: { label: 'Tag' },
  argTypes: {
    intent: {
      control: 'select',
      options: ['neutral', 'primary', 'success', 'warning', 'destructive'],
    },
    emphasis: { control: 'inline-radio', options: ['soft', 'solid'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof PUITag>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { label: 'Design' } }
export const Primary: Story = { args: { label: 'Featured', intent: 'primary' } }
export const Success: Story = { args: { label: 'Active', intent: 'success' } }
export const Warning: Story = { args: { label: 'Pending', intent: 'warning' } }
export const Destructive: Story = { args: { label: 'Blocked', intent: 'destructive' } }

export const Solid: Story = { args: { label: 'Featured', intent: 'primary', emphasis: 'solid' } }

export const WithLeadingIcon: Story = {
  args: { label: 'Frontend', intent: 'primary', leadingIcon: Hash },
}

export const Removable: Story = {
  args: { label: 'TypeScript', intent: 'success', onRemove: () => {} },
}

export const Disabled: Story = {
  args: { label: 'Archived', intent: 'neutral', onRemove: () => {}, disabled: true },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <PUITag intent="primary" label="Small" size="sm" />
      <PUITag intent="primary" label="Medium" size="md" />
      <PUITag intent="primary" label="Large" size="lg" />
    </div>
  ),
}

export const Emphasis: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <PUITag emphasis="soft" intent="success" label="Soft" leadingIcon={Check} />
      <PUITag emphasis="solid" intent="success" label="Solid" leadingIcon={Check} />
    </div>
  ),
}

export const Cluster: Story = {
  render: () => (
    <div className="flex max-w-80 flex-wrap gap-2">
      <PUITag intent="primary" label="React" leadingIcon={Star} onRemove={() => {}} />
      <PUITag intent="success" label="TypeScript" onRemove={() => {}} />
      <PUITag intent="warning" label="Storybook" onRemove={() => {}} />
      <PUITag intent="neutral" label="Tailwind" onRemove={() => {}} />
      <PUITag intent="destructive" label="Deprecated" onRemove={() => {}} />
    </div>
  ),
}
