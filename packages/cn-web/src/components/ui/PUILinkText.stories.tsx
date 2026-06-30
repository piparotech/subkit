import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUILinkText } from './PUILinkText'

const meta = {
  title: 'PUI/Display/LinkText',
  component: PUILinkText,
  tags: ['autodocs'],
  args: { children: 'Learn more' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUILinkText>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <PUILinkText onClick={() => {}}>Learn more</PUILinkText>,
}
export const DefaultTone: Story = {
  render: () => (
    <PUILinkText onClick={() => {}} tone="default">
      Learn more
    </PUILinkText>
  ),
}
export const Disabled: Story = {
  render: () => (
    <PUILinkText disabled onClick={() => {}}>
      Learn more
    </PUILinkText>
  ),
}
export const AsLink: Story = {
  render: () => <PUILinkText href="https://piparo.tech">Visit piparo.tech</PUILinkText>,
}
