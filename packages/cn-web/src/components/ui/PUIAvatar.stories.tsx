import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIAvatar } from './PUIAvatar'

const PHOTO = 'https://i.pravatar.cc/150?img=12'

const meta = {
  title: 'PUI/Media/Avatar',
  component: PUIAvatar,
  tags: ['autodocs'],
  args: { name: 'Ada Lovelace' },
} satisfies Meta<typeof PUIAvatar>

export default meta
type Story = StoryObj<typeof meta>

export const Image: Story = { args: { src: PHOTO } }

export const Initials: Story = { args: { name: 'Grace Hopper' } }

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <PUIAvatar name="Ada Lovelace" size="sm" />
      <PUIAvatar name="Ada Lovelace" size="md" />
      <PUIAvatar name="Ada Lovelace" size="lg" />
    </div>
  ),
}
