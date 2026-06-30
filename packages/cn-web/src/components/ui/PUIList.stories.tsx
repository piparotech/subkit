import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge } from './PUIBadge'
import { PUIList, PUIListItem, PUIListSection } from './PUIList'

const meta = {
  title: 'PUI/Layout/List',
  component: PUIList,
  tags: ['autodocs'],
  args: { children: null },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIList>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <PUIList>
      <PUIListItem title="Profile" />
      <PUIListItem subtitle="3 unread" title="Notifications" />
      <PUIListItem title="Privacy" />
    </PUIList>
  ),
}

export const Pressable: Story = {
  render: () => (
    <PUIList>
      <PUIListItem onPress={() => {}} title="Account" />
      <PUIListItem onPress={() => {}} subtitle="English" title="Language" />
      <PUIListItem onPress={() => {}} title="About" />
    </PUIList>
  ),
}

export const WithLeadingAndTrailing: Story = {
  render: () => (
    <PUIList>
      <PUIListItem
        leading={<span style={{ fontSize: 20 }}>{'🔔'}</span>}
        onPress={() => {}}
        subtitle="Push, email"
        title="Notifications"
        trailing={<PUIBadge>3</PUIBadge>}
      />
      <PUIListItem
        leading={<span style={{ fontSize: 20 }}>{'🌐'}</span>}
        onPress={() => {}}
        title="Language"
        trailing={<span className="text-sm text-muted-foreground">English</span>}
      />
    </PUIList>
  ),
}

export const Sections: Story = {
  render: () => (
    <PUIList>
      <PUIListSection header="Account">
        <PUIListItem onPress={() => {}} title="Profile" />
        <PUIListItem onPress={() => {}} subtitle="3 unread" title="Notifications" />
      </PUIListSection>
      <PUIListSection header="General">
        <PUIListItem onPress={() => {}} title="Language" />
        <PUIListItem onPress={() => {}} title="About" />
      </PUIListSection>
    </PUIList>
  ),
}
