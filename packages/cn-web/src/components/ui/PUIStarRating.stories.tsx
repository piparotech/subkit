import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIStarRating, type PUIStarRatingProps } from './PUIStarRating'

function Controlled({ value: initial = 3, ...props }: Partial<PUIStarRatingProps>) {
  const [value, setValue] = useState(initial)
  return <PUIStarRating onChange={setValue} value={value} {...props} />
}

const meta = {
  title: 'PUI/Input/StarRating',
  component: PUIStarRating,
  tags: ['autodocs'],
  args: { value: 3, max: 5 },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['interactive', 'descriptive'] },
    half: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof PUIStarRating>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Controlled label="Rate this product" />,
}

export const Large: Story = {
  render: () => <Controlled label="Rate this product" size="lg" value={4} />,
}

export const Small: Story = {
  render: () => <Controlled label="Rate this product" size="sm" value={2} />,
}

export const Half: Story = {
  render: () => <Controlled half label="Rate this product" value={3.5} />,
}

export const Descriptive: Story = {
  args: { value: 4.5, variant: 'descriptive' },
}

export const DescriptiveSummary: Story = {
  args: {
    value: 4.5,
    size: 'sm',
    variant: 'descriptive',
    leadingLabel: '4.5',
    trailingLabel: '(6311)',
  },
}

export const Disabled: Story = {
  args: { value: 3, disabled: true },
}

export const TenStars: Story = {
  render: () => <Controlled label="Score out of ten" max={10} value={7} />,
}
