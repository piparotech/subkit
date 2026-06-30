import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, CreditCard, ShieldCheck, Truck } from 'lucide-react'

import { PUIAccordion } from './PUIAccordion'
import { type PUIAccordionItem, type PUIAccordionProps } from './PUIAccordion.types'

const items: PUIAccordionItem[] = [
  {
    value: 'shipping',
    title: 'Is shipping free?',
    content: 'Yes, every order over 50 € ships free within Germany and Austria.',
  },
  {
    value: 'returns',
    title: 'How do returns work?',
    content: 'Send anything back within 30 days for a full refund, no questions asked.',
  },
  {
    value: 'support',
    title: 'How do I reach support?',
    content: 'Tap the chat bubble in the app, or write to support@piparo.tech.',
  },
]

const richItems: PUIAccordionItem[] = [
  {
    value: 'shipping',
    title: 'Shipping',
    supportingText: 'Delivery windows and carriers',
    leadingIcon: Truck,
    trailingLabel: 'Free',
    content: 'Standard delivery takes two to four working days. Express ships next day.',
  },
  {
    value: 'billing',
    title: 'Billing',
    supportingText: 'Cards, invoices and receipts',
    leadingIcon: CreditCard,
    trailingLabel: '3 cards',
    accessibilityHint: 'Shows your saved payment methods.',
    content: 'We accept all major cards and SEPA. Invoices arrive by email after each charge.',
  },
  {
    value: 'security',
    title: 'Security',
    supportingText: 'Two-factor and active sessions',
    leadingIcon: ShieldCheck,
    trailingLabel: 'On',
    content: 'Two-factor authentication is enabled. Review active sessions to sign devices out.',
  },
  {
    value: 'notifications',
    title: 'Notifications',
    supportingText: 'Email and push preferences',
    leadingIcon: Bell,
    trailingLabel: 'Muted',
    disabled: true,
    content: 'Notification settings open once you verify your email address.',
  },
]

const meta = {
  title: 'PUI/Disclosure/Accordion',
  component: PUIAccordion,
  tags: ['autodocs'],
  args: { type: 'single', items },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<PUIAccordionProps>

export default meta
type Story = StoryObj<PUIAccordionProps>

export const Single: Story = {
  render: () => <PUIAccordion defaultValue="shipping" items={items} type="single" />,
}

export const Multiple: Story = {
  render: () => (
    <PUIAccordion defaultValue={['shipping', 'support']} items={items} type="multiple" />
  ),
}

export const WithLeadingIconAndDetails: Story = {
  render: () => <PUIAccordion defaultValue="shipping" items={richItems} type="single" />,
}

function ControlledSingleAccordion() {
  const [value, setValue] = useState<string | null>('returns')
  return <PUIAccordion items={items} onValueChange={setValue} type="single" value={value} />
}

export const ControlledSingle: Story = { render: () => <ControlledSingleAccordion /> }

export const Disabled: Story = {
  render: () => <PUIAccordion defaultValue="shipping" disabled items={items} type="single" />,
}
