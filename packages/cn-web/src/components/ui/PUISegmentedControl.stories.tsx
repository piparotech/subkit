import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { List, Map, Rows3 } from 'lucide-react'

import {
  PUISegmentedControl,
  type PUISegmentedControlProps,
  type PUISegmentedOption,
} from './PUISegmentedControl'

const VIEW_OPTIONS = [
  { label: 'List', value: 'list' },
  { label: 'Grid', value: 'grid' },
  { label: 'Map', value: 'map' },
]

const ICON_OPTIONS: PUISegmentedOption[] = [
  {
    label: 'List',
    value: 'list',
    icon: ({ color, size }) => <List color={color} size={size} />,
  },
  {
    label: 'Grid',
    value: 'grid',
    icon: ({ color, size }) => <Rows3 color={color} size={size} />,
  },
  {
    label: 'Map',
    value: 'map',
    icon: ({ color, size }) => <Map color={color} size={size} />,
  },
]

function Controlled({
  value: initial = 'list',
  options = VIEW_OPTIONS,
  ...props
}: Partial<PUISegmentedControlProps>) {
  const [value, setValue] = useState(initial)
  return <PUISegmentedControl onValueChange={setValue} options={options} value={value} {...props} />
}

const meta = {
  title: 'PUI/Navigation/SegmentedControl',
  component: PUISegmentedControl,
  tags: ['autodocs'],
  args: { options: VIEW_OPTIONS, value: 'list' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUISegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <Controlled /> }

export const TwoOptions: Story = {
  render: () => (
    <Controlled
      options={[
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
      ]}
      value="day"
    />
  ),
}

export const WithIcons: Story = {
  render: () => <Controlled options={ICON_OPTIONS} />,
}

export const Hug: Story = {
  render: () => (
    <Controlled
      options={[
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Completed today', value: 'done' },
      ]}
      value="all"
      width="hug"
    />
  ),
}

export const IconOnly: Story = {
  render: () => (
    <Controlled
      options={[
        {
          ariaLabel: 'List view',
          value: 'list',
          icon: ({ color, size }) => <List color={color} size={size} />,
        },
        {
          ariaLabel: 'Grid view',
          value: 'grid',
          icon: ({ color, size }) => <Rows3 color={color} size={size} />,
        },
        {
          ariaLabel: 'Map view',
          value: 'map',
          icon: ({ color, size }) => <Map color={color} size={size} />,
        },
      ]}
      width="hug"
    />
  ),
}

export const Disabled: Story = {
  render: () => <PUISegmentedControl disabled options={VIEW_OPTIONS} value="grid" />,
}
