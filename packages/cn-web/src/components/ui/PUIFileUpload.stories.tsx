import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIFileUpload } from './PUIFileUpload'
import { type PUIFileUploadItem, type PUIFileUploadOwnProps } from './PUIFileUpload.types'

function Controlled({ value: initial = [], ...props }: Partial<PUIFileUploadOwnProps>) {
  const [value, setValue] = useState<PUIFileUploadItem[]>(initial)
  return <PUIFileUpload value={value} onChange={setValue} {...props} />
}

const PRESELECTED: PUIFileUploadItem[] = [
  { id: 'a', name: 'quarterly-report.pdf', size: 1_482_321 },
  { id: 'b', name: 'team-photo.png', size: 248_004 },
]

const IN_PROGRESS: PUIFileUploadItem[] = [
  { id: 'a', name: 'archive.zip', size: 18_400_000, status: 'uploading', progress: 64 },
  { id: 'b', name: 'logo.svg', size: 4_120, status: 'done' },
  { id: 'c', name: 'oversized-video.mov', status: 'error', error: 'Larger than 10 MB' },
]

const meta = {
  title: 'PUI/Forms/FileUpload',
  component: PUIFileUpload,
  tags: ['autodocs'],
  args: { value: [], onChange: () => {} },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PUIFileUpload>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Controlled hint="PDF or images, up to 10 MB" label="Attachments" />,
}

export const Multiple: Story = {
  render: () => <Controlled label="Documents" multiple value={PRESELECTED} />,
}

export const WithAcceptAndMaxSize: Story = {
  render: () => (
    <Controlled
      accept="image/png,image/jpeg,.pdf"
      hint="PNG, JPEG or PDF, up to 5 MB"
      label="Upload a file"
      maxSize={5_000_000}
      multiple
    />
  ),
}

export const Statuses: Story = {
  render: () => <Controlled label="Uploading" multiple value={IN_PROGRESS} />,
}

export const WithError: Story = {
  render: () => <Controlled error="At least one file is required" label="Attachments" />,
}

export const Disabled: Story = {
  render: () => (
    <Controlled disabled hint="Editing is locked" label="Attachments" value={PRESELECTED} />
  ),
}
