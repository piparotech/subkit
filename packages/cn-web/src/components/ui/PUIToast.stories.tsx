import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIButton } from './PUIButton'
import { PUIToastProvider, type PUIToastProviderProps, useToast } from './PUIToast'

function Demo() {
  const { toast } = useToast()
  return (
    <div className="flex flex-col items-start gap-3">
      <PUIButton onPress={() => toast({ title: 'Saved', description: 'Your changes were saved.' })}>
        Show default
      </PUIButton>
      <PUIButton
        onPress={() =>
          toast({ title: 'Upload complete', description: 'File is ready.', variant: 'success' })
        }
        variant="secondary"
      >
        Show success
      </PUIButton>
      <PUIButton
        onPress={() =>
          toast({
            title: 'Something went wrong',
            description: 'Please try again.',
            variant: 'destructive',
          })
        }
        variant="destructive"
      >
        Show error
      </PUIButton>
    </div>
  )
}

function Wrapper({ position }: Partial<PUIToastProviderProps>) {
  return (
    <PUIToastProvider position={position}>
      <Demo />
    </PUIToastProvider>
  )
}

const meta = {
  title: 'PUI/Overlays/Toast',
  component: PUIToastProvider,
  tags: ['autodocs'],
  args: { children: null },
} satisfies Meta<typeof PUIToastProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Top: Story = { render: () => <Wrapper position="top" /> }

export const Bottom: Story = { render: () => <Wrapper position="bottom" /> }
