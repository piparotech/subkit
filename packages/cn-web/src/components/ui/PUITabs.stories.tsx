import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Activity, Bell, Settings } from 'lucide-react'

import { type PUITabItem, PUITabs, type PUITabsProps } from './PUITabs'

const items: PUITabItem[] = [
  {
    value: 'overview',
    label: 'Overview',
    content: 'A calm summary of the account: usage this month, recent activity and quick actions.',
  },
  {
    value: 'activity',
    label: 'Activity',
    content: 'Every event in order: sign-ins, exports and configuration changes with timestamps.',
  },
  {
    value: 'settings',
    label: 'Settings',
    content:
      'Profile, notifications and danger-zone controls. Changes save the moment you make them.',
  },
]

const iconItems: PUITabItem[] = [
  {
    value: 'overview',
    label: 'Overview',
    icon: <Activity className="size-4" />,
    content: items[0].content,
  },
  {
    value: 'alerts',
    label: 'Alerts',
    icon: <Bell className="size-4" />,
    content: items[1].content,
  },
  {
    value: 'settings',
    label: 'Settings',
    icon: <Settings className="size-4" />,
    content: items[2].content,
  },
]

const meta = {
  title: 'PUI/Navigation/Tabs',
  component: PUITabs,
  tags: ['autodocs'],
  args: { items, defaultValue: 'overview' },
  decorators: [
    (Story) => (
      <div className="w-[28rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<PUITabsProps>

export default meta
type Story = StoryObj<PUITabsProps>

export const Default: Story = { render: () => <PUITabs defaultValue="overview" items={items} /> }

export const WithIcons: Story = {
  render: () => <PUITabs defaultValue="overview" items={iconItems} />,
}

function ControlledTabs() {
  const [value, setValue] = useState('activity')
  return <PUITabs items={items} onValueChange={setValue} value={value} />
}

export const Controlled: Story = { render: () => <ControlledTabs /> }

export const DisabledTab: Story = {
  render: () => (
    <PUITabs
      defaultValue="overview"
      items={[items[0], { ...items[1], disabled: true }, items[2]]}
    />
  ),
}

export const Disabled: Story = {
  render: () => <PUITabs defaultValue="overview" disabled items={items} />,
}
